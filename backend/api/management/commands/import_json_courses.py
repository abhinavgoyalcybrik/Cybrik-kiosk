import os
import json
import re
from pathlib import Path
from django.core.management.base import BaseCommand
from django.db import transaction
from api.models import University, Course, CourseIntake, CourseFee, EnglishRequirement, AcademicRequirement, DocumentRequirement

class Command(BaseCommand):
    help = 'Import courses from JSON files in the Output folder'

    def add_arguments(self, parser):
        default_dir = Path(__file__).resolve().parents[4] / 'universities'
        parser.add_argument(
            '--input-dir',
            type=str,
            default=str(default_dir),
            help='Directory containing university JSON files',
        )

    def stringify(self, value):
        if value is None:
            return ""
        if isinstance(value, str):
            return value.strip()
        if isinstance(value, (int, float, bool)):
            return str(value)
        if isinstance(value, list):
            parts = [self.stringify(item) for item in value]
            return ", ".join([part for part in parts if part])
        if isinstance(value, dict):
            if "type" in value or "requirement" in value:
                prefix = self.stringify(value.get("type") or value.get("requirement"))
                details = self.stringify(
                    value.get("requirements") or value.get("description") or value.get("value")
                )
                if prefix and details:
                    return f"{prefix}: {details}"
                return prefix or details
            parts = []
            for key, nested_value in value.items():
                text = self.stringify(nested_value)
                if text:
                    parts.append(f"{str(key).replace('_', ' ')}: {text}")
            return "; ".join(parts)
        return str(value).strip()

    def to_float_or_none(self, value):
        if value is None:
            return None
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            match = re.search(r"\d+(?:\.\d+)?", value)
            return float(match.group(0)) if match else None
        if isinstance(value, dict):
            for key in ("score", "band", "overall", "value", "minimum"):
                if key in value and value[key] is not None:
                    return self.to_float_or_none(value[key])
        return None

    def to_bool(self, value):
        if isinstance(value, bool):
            return value
        if value is None:
            return False
        if isinstance(value, (int, float)):
            return value != 0
        if isinstance(value, str):
            return value.strip().lower() in {"true", "yes", "y", "1"}
        return False

    def handle(self, *args, **options):
        output_dir = Path(options['input_dir']).expanduser().resolve()
        if not output_dir.exists() or not output_dir.is_dir():
            self.stdout.write(self.style.ERROR(f'Input directory not found: {output_dir}'))
            return

        json_files = sorted(output_dir.glob('*.json'))
        
        if not json_files:
            self.stdout.write(self.style.ERROR(f'No JSON files found in {output_dir}'))
            return
        
        self.stdout.write(f'Found {len(json_files)} JSON files to import from {output_dir}')
        
        university_count = 0
        course_count = 0
        
        for json_file in json_files:
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                # Extract metadata
                metadata = data.get('metadata', {})
                university_name = metadata.get('university_name', '').strip()
                source_url = metadata.get('source', '')
                
                if not university_name:
                    self.stdout.write(self.style.WARNING(f'⊘ Skipping {json_file.name} - no university name'))
                    continue
                
                # Extract programs to find location
                programs = data.get('programs', [])
                
                # Get a sample location from first program
                sample_location = None
                if programs and programs[0].get('campus_location'):
                    locations = programs[0]['campus_location']
                    sample_location = locations[0] if isinstance(locations, list) else locations
                
                # Determine country from metadata source URL or filename
                country = self.infer_country(source_url, json_file.name)
                city = sample_location or 'N/A'
                
                # Refresh the university row so re-imports replace the existing course set.
                university, created = University.objects.update_or_create(
                    name=university_name,
                    defaults={
                        'country': country,
                        'city': city,
                        'official_website': source_url,
                    }
                )
                
                if created:
                    university_count += 1
                    self.stdout.write(self.style.SUCCESS(f'✓ Created university: {university_name} ({country})'))
                else:
                    self.stdout.write(f'  University exists: {university_name}')

                with transaction.atomic():
                    seen_course_ids = set()

                    # Import courses
                    for program in programs:
                        try:
                            title = program.get('program_course_name', 'N/A')
                            degree_level = program.get('course_level') or ''

                            # Parse duration
                            duration_str = program.get('course_duration', '')
                            duration_months = self.parse_duration(duration_str)

                            # Get tuition info
                            tuition_data = program.get('annual_tuition_fee', {})
                            tuition_amount_raw = tuition_data.get('amount', 0) if isinstance(tuition_data, dict) else 0
                            tuition_amount = self.to_float_or_none(tuition_amount_raw) or 0
                            tuition_currency = (tuition_data.get('currency') if isinstance(tuition_data, dict) else 'USD') or ''

                            # Get course source URL
                            source_ref = program.get('source_reference', {})
                            course_url = source_ref.get('primary_source', '') if isinstance(source_ref, dict) else ''

                            # Create course
                            internship_available = self.to_bool(
                                program.get('internship_work_placement_opportunities', False)
                            )

                            course, course_created = Course.objects.get_or_create(
                                university=university,
                                title=title,
                                degree_level=degree_level,
                                defaults={
                                    'field_of_study': '',
                                    'duration_months': duration_months,
                                    'course_url': course_url,
                                    'internship_available': internship_available,
                                    'course_summary': '',
                                }
                            )

                            if course_created:
                                course_count += 1
                            seen_course_ids.add(course.id)

                            # Create or update course fee
                            CourseFee.objects.update_or_create(
                                course=course,
                                defaults={
                                    'tuition_fee': tuition_amount if tuition_amount > 0 else None,
                                    'currency': tuition_currency,
                                    'fee_period': 'per year',
                                }
                            )

                            # Create/update intakes
                            intakes = program.get('intakes') or []
                            if not isinstance(intakes, list):
                                intakes = [intakes]
                            for intake_month in intakes:
                                if not intake_month:
                                    continue
                                CourseIntake.objects.get_or_create(
                                    course=course,
                                    intake_month=intake_month,
                                    defaults={
                                        'status': 'Open',
                                    }
                                )

                            # Create/update English requirements
                            english_scores = program.get('minimum_english_language_score_requirements', {})

                            ielts_score = self.to_float_or_none(
                                english_scores.get('IELTS') if isinstance(english_scores, dict) else None
                            )
                            toefl_score = self.to_float_or_none(
                                english_scores.get('TOEFL') if isinstance(english_scores, dict) else None
                            )
                            pte_score = self.to_float_or_none(
                                english_scores.get('PTE') if isinstance(english_scores, dict) else None
                            )

                            EnglishRequirement.objects.update_or_create(
                                course=course,
                                defaults={
                                    'ielts_overall': ielts_score,
                                    'toefl_overall': toefl_score,
                                    'pte_overall': pte_score,
                                }
                            )

                            # Create/update Academic requirements
                            academic_reqs = program.get('academic_requirements', [])
                            academic_reqs_text = self.stringify(academic_reqs)
                            AcademicRequirement.objects.update_or_create(
                                course=course,
                                defaults={
                                    'required_qualification': academic_reqs_text,
                                }
                            )

                            # Create/update Document requirements
                            DocumentRequirement.objects.update_or_create(
                                course=course,
                                defaults={
                                    'sop_required': False,
                                    'lor_required': False,
                                    'resume_required': False,
                                }
                            )

                        except Exception as e:
                            self.stdout.write(self.style.WARNING(f'  ⊘ Error creating course "{title}": {str(e)}'))
                            continue

                    # Remove courses that are no longer present in the source JSON,
                    # without touching rows that were matched above (preserves human_verified).
                    stale_courses = Course.objects.filter(university=university).exclude(id__in=seen_course_ids)
                    stale_count = stale_courses.count()
                    if stale_count:
                        stale_courses.delete()
                        self.stdout.write(f'  Removed {stale_count} stale course(s) for {university_name}')

            except json.JSONDecodeError as e:
                self.stdout.write(self.style.ERROR(f'✗ Invalid JSON in {json_file.name}: {str(e)}'))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'✗ Error processing {json_file.name}: {str(e)}'))
        
        self.stdout.write(self.style.SUCCESS(f'\n✓✓✓ Import complete! ✓✓✓'))
        self.stdout.write(self.style.SUCCESS(f'   Created {university_count} universities'))
        self.stdout.write(self.style.SUCCESS(f'   Created {course_count} courses'))

    # Maps TLD / domain keyword → country.  Checked in order; first match wins.
    DOMAIN_COUNTRY_MAP = [
        ('.edu.au',   'Australia'),
        ('.ac.nz',    'New Zealand'),
        ('.ac.nz',    'New Zealand'),
        ('.atmc.ac.nz', 'New Zealand'),
        ('.edu.nz',   'New Zealand'),
        ('.ac.uk',    'United Kingdom'),
        ('.co.uk',    'United Kingdom'),
        ('.bcu.ac.uk', 'United Kingdom'),
        ('.leedsbeckett.ac.uk', 'United Kingdom'),
        ('.napier.ac.uk', 'United Kingdom'),
        ('.hw.ac.uk', 'United Kingdom'),
        ('.aber.ac.uk', 'United Kingdom'),
        ('.keele.ac.uk', 'United Kingdom'),
        ('.kingston.ac.uk', 'United Kingdom'),
        ('.ljmu.ac.uk', 'United Kingdom'),
        ('.leedstrinity.ac.uk', 'United Kingdom'),
        ('.imperial.ac.uk', 'United Kingdom'),
        ('.cranfield.ac.uk', 'United Kingdom'),
        ('.coventry.ac.uk', 'United Kingdom'),
        ('.dmu.ac.uk', 'United Kingdom'),
        ('.de/',      'Germany'),
        ('.de',       'Germany'),
        ('.lv/',      'Latvia'),
        ('.lv',       'Latvia'),
        ('.edu/',     'Australia'),   # fallback for .edu without AU TLD
        ('academyex.com', 'Australia'),
        ('acap.edu.au', 'Australia'),
        ('berlinsbi.com', 'Germany'),
        ('arden.ac.uk', 'United Kingdom'),
        ('gisma.com', 'Germany'),
        ('schiller.edu', 'United States'),
        ('ue-germany.com', 'Germany'),
        ('lancasterleipzig.de', 'Germany'),
        ('mediadesign.de', 'Germany'),
        ('srh-university.de', 'Germany'),
        ('karlshochschule.de', 'Germany'),
        ('ebs.edu', 'Germany'),
        ('pihms.ac.nz', 'New Zealand'),
        ('manukau.ac.nz', 'New Zealand'),
        ('waikato.ac.nz', 'New Zealand'),
        ('massey.ac.nz', 'New Zealand'),
        ('aut.ac.nz', 'New Zealand'),
        ('auckland.ac.nz', 'New Zealand'),
        ('canterbury.ac.nz', 'New Zealand'),
        ('wgtn.ac.nz', 'New Zealand'),
        ('sit.ac.nz', 'New Zealand'),
    ]

    # Filename keyword fallback when domain match fails
    FILENAME_COUNTRY_MAP = [
        # New Zealand
        ('auckland', 'New Zealand'),
        ('canterbury', 'New Zealand'),
        ('waikato', 'New Zealand'),
        ('wellington', 'New Zealand'),
        ('massey', 'New Zealand'),
        ('manakau', 'New Zealand'),
        ('southern_institute', 'New Zealand'),
        ('atmc', 'New Zealand'),
        ('pihms', 'New Zealand'),
        # Germany
        ('berlin', 'Germany'),
        ('gisma', 'Germany'),
        ('karlshochschule', 'Germany'),
        ('mediadesign', 'Germany'),
        ('srh', 'Germany'),
        ('ebs_university', 'Germany'),
        ('lancaster_university_leipzig', 'Germany'),
        ('arden_university_berlin', 'Germany'),
        ('university_of_europe', 'Germany'),
        # Latvia
        ('riga', 'Latvia'),
        ('turiba', 'Latvia'),
        ('nordic', 'Latvia'),
        # UK
        ('aberystwyth', 'United Kingdom'),
        ('birmingham', 'United Kingdom'),
        ('coventry', 'United Kingdom'),
        ('cranfield', 'United Kingdom'),
        ('de_montfort', 'United Kingdom'),
        ('edinburgh_napier', 'United Kingdom'),
        ('heriot', 'United Kingdom'),
        ('imperial', 'United Kingdom'),
        ('keele', 'United Kingdom'),
        ('kingston', 'United Kingdom'),
        ('lancaster_university_leip', 'Germany'),
        ('leeds_beckett', 'United Kingdom'),
        ('leeds_trinity', 'United Kingdom'),
        ('liverpool_john', 'United Kingdom'),
        ('schiller', 'United States'),
    ]

    def infer_country(self, source_url: str, filename: str) -> str:
        url_lower = (source_url or '').lower()
        for pattern, country in self.DOMAIN_COUNTRY_MAP:
            if pattern in url_lower:
                return country

        file_lower = filename.lower()
        for keyword, country in self.FILENAME_COUNTRY_MAP:
            if keyword in file_lower:
                return country

        return 'Australia'

    def parse_duration(self, duration_str):
        """Parse duration string to months"""
        if not duration_str:
            return None

        if not isinstance(duration_str, str):
            duration_str = self.stringify(duration_str)
        
        # Look for year patterns
        years = re.search(r'(\d+(?:\.\d+)?)\s*(?:year|yr)', duration_str, re.IGNORECASE)
        if years:
            return int(float(years.group(1)) * 12)
        
        # Look for month patterns
        months = re.search(r'(\d+)\s*(?:month|mo|m)', duration_str, re.IGNORECASE)
        if months:
            return int(months.group(1))
        
        # Look for week patterns
        weeks = re.search(r'(\d+)\s*(?:week|wk)', duration_str, re.IGNORECASE)
        if weeks:
            return int(weeks.group(1)) // 4  # Rough conversion
        
        return None
