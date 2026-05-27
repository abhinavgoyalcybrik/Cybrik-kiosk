#!/usr/bin/env python
import os
import json
import re
from pathlib import Path
from django.core.management.base import BaseCommand
from api.models import University, Course, CourseIntake, CourseFee, EnglishRequirement, AcademicRequirement, DocumentRequirement

class Command(BaseCommand):
    help = 'Import courses from JSON files in the Output folder'

    def handle(self, *args, **options):
        output_dir = Path('/home/cybrik001/cybrik-edugraph/Output')
        json_files = sorted(output_dir.glob('*.json'))
        
        if not json_files:
            self.stdout.write(self.style.ERROR('No JSON files found in Output folder'))
            return
        
        self.stdout.write(f'Found {len(json_files)} JSON files')
        
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
                    self.stdout.write(self.style.WARNING(f'Skipping {json_file.name} - no university name'))
                    continue
                
                # Extract country and city from campus locations
                programs = data.get('programs', [])
                
                # Get a sample location from first program
                sample_location = None
                if programs and programs[0].get('campus_location'):
                    sample_location = programs[0]['campus_location'][0]
                
                # Determine country based on file content or default
                country = 'Australia'  # Default
                if 'berlin' in json_file.name.lower() or 'riga' in json_file.name.lower():
                    country = 'Germany' if 'berlin' in json_file.name.lower() else 'Latvia'
                elif 'auckland' in json_file.name.lower() or 'canterbury' in json_file.name.lower() or 'waikato' in json_file.name.lower():
                    country = 'New Zealand'
                
                # Create or get university
                university, created = University.objects.get_or_create(
                    name=university_name,
                    defaults={
                        'country': country,
                        'city': sample_location or 'N/A',
                        'official_website': source_url,
                    }
                )
                
                if created:
                    university_count += 1
                    self.stdout.write(self.style.SUCCESS(f'Created university: {university_name}'))
                else:
                    self.stdout.write(f'University already exists: {university_name}')
                
                # Import courses
                for program in programs:
                    try:
                        title = program.get('program_course_name', 'N/A')
                        degree_level = program.get('course_level', '')
                        
                        # Parse duration
                        duration_str = program.get('course_duration', '')
                        duration_months = parse_duration(duration_str)
                        
                        # Get tuition info
                        tuition_data = program.get('annual_tuition_fee', {})
                        tuition_amount = tuition_data.get('amount', 0) if isinstance(tuition_data, dict) else 0
                        tuition_currency = tuition_data.get('currency', 'USD') if isinstance(tuition_data, dict) else 'USD'
                        
                        # Create course
                        course, course_created = Course.objects.get_or_create(
                            university=university,
                            title=title,
                            degree_level=degree_level,
                            defaults={
                                'field_of_study': '',
                                'duration_months': duration_months,
                                'course_url': program.get('source_reference', {}).get('primary_source', '') if isinstance(program.get('source_reference'), dict) else '',
                                'internship_available': program.get('internship_work_placement_opportunities', False),
                                'course_summary': '',
                            }
                        )
                        
                        if course_created:
                            course_count += 1
                        
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
                        intakes = program.get('intakes', [])
                        for intake_month in intakes:
                            CourseIntake.objects.get_or_create(
                                course=course,
                                intake_month=intake_month,
                                defaults={
                                    'status': 'Open',
                                }
                            )
                        
                        # Create/update English requirements
                        english_tests = program.get('accepted_english_language_tests', [])
                        english_scores = program.get('minimum_english_language_score_requirements', {})
                        
                        EnglishRequirement.objects.update_or_create(
                            course=course,
                            defaults={
                                'ielts_overall': english_scores.get('IELTS') if isinstance(english_scores, dict) else None,
                                'toefl_overall': english_scores.get('TOEFL') if isinstance(english_scores, dict) else None,
                                'pte_overall': english_scores.get('PTE') if isinstance(english_scores, dict) else None,
                            }
                        )
                        
                        # Create/update Academic requirements
                        academic_reqs = program.get('academic_requirements', [])
                        AcademicRequirement.objects.update_or_create(
                            course=course,
                            defaults={
                                'required_qualification': ', '.join(academic_reqs) if academic_reqs else '',
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
                        self.stdout.write(self.style.WARNING(f'Error creating course {title}: {str(e)}'))
                        continue
                
            except json.JSONDecodeError as e:
                self.stdout.write(self.style.ERROR(f'Invalid JSON in {json_file.name}: {str(e)}'))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error processing {json_file.name}: {str(e)}'))
        
        self.stdout.write(self.style.SUCCESS(f'\n✓ Import complete! Created {university_count} universities and {course_count} courses'))

def parse_duration(duration_str):
    """Parse duration string to months"""
    if not duration_str:
        return None
    
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
