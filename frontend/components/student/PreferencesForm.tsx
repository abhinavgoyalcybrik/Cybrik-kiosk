"use client";

import { StudentProfile } from "@/hooks/useRecommendations";

type PreferencesFormProps = {
  profile: StudentProfile;
  updateProfileField: (
    field: keyof StudentProfile,
    value: string | string[]
  ) => void;
};

const countries = [
  "Australia",
  "United Kingdom",
  "Canada",
  "New Zealand",
  "Germany",
];

const cityMap: Record<string, string[]> = {
  Australia: ["Melbourne", "Sydney", "Brisbane", "Perth", "Adelaide", "Canberra"],
  "United Kingdom": ["London", "Manchester", "Birmingham", "Leeds", "Glasgow", "Edinburgh"],
  Canada: ["Toronto", "Vancouver", "Montreal", "Calgary", "Ottawa", "Edmonton"],
  "New Zealand": ["Auckland", "Wellington", "Christchurch", "Hamilton"],
  Germany: ["Berlin", "Munich", "Frankfurt", "Hamburg", "Cologne"],
};

const fields = [
  "Engineering",
  "Business",
  "Computer Science",
  "Data Science",
  "Cyber Security",
  "Health Sciences",
  "Commerce",
  "Arts & Humanities",
  "Animation & Design",
  "Hospitality",
];

const intakes = [
  { label: "Spring (Feb – Apr)", value: "Spring (Feb – Apr)", endMonth: 4 },
  { label: "Summer (May – Jul)", value: "Summer (May – Jul)", endMonth: 7 },
  { label: "Fall (Aug – Oct)", value: "Fall (Aug – Oct)", endMonth: 10 },
  { label: "Winter (Nov – Jan)", value: "Winter (Nov – Jan)", endMonth: 12 },
];

const currentDate = new Date();
const currentYear = currentDate.getFullYear();
const currentMonth = currentDate.getMonth() + 1;

const years = [currentYear, currentYear + 1, currentYear + 2, currentYear + 3];

const isIntakeDisabled = (intakeEndMonth: number, selectedYear: string) => {
  if (!selectedYear) return false;

  const intakeYear = Number(selectedYear);

  return intakeYear === currentYear && intakeEndMonth < currentMonth;
};

export default function PreferencesForm({
  profile,
  updateProfileField,
}: PreferencesFormProps) {
  const availableCities = profile.preferredCountries.flatMap(
    (country) => cityMap[country] || []
  );

  const toggleArrayValue = (
    field: keyof StudentProfile,
    currentValues: string[],
    value: string
  ) => {
    const updatedValues = currentValues.includes(value)
      ? currentValues.filter((item) => item !== value)
      : [...currentValues, value];

    updateProfileField(field, updatedValues);
  };

  return (
    <div className="space-y-5">
      <MultiSelectGroup
        label="Preferred Countries"
        options={countries}
        selected={profile.preferredCountries}
        onToggle={(value) =>
          toggleArrayValue(
            "preferredCountries",
            profile.preferredCountries,
            value
          )
        }
      />

      <MultiSelectGroup
        label="Preferred Cities"
        options={availableCities}
        selected={profile.preferredCities}
        disabled={profile.preferredCountries.length === 0}
        emptyText="Select countries first"
        onToggle={(value) =>
          toggleArrayValue("preferredCities", profile.preferredCities, value)
        }
      />

      <MultiSelectGroup
        label="Preferred Course / Field"
        options={fields}
        selected={profile.preferredFields}
        onToggle={(value) =>
          toggleArrayValue("preferredFields", profile.preferredFields, value)
        }
      />

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Preferred University (Optional)
        </label>
        <input
          type="text"
          className="form-input"
          placeholder="e.g. Deakin University"
          value={profile.preferredUniversity}
          onChange={(e) => updateProfileField("preferredUniversity", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Intake Year
          </label>

          <select
            className="form-input"
            value={profile.preferredIntakeYear}
            onChange={(e) => {
              updateProfileField("preferredIntakeYear", e.target.value);
              updateProfileField("preferredIntakeSeason", "");
            }}
          >
            <option value="">Select year</option>

            {years.map((year) => (
              <option key={year} value={String(year)}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Intake Season
          </label>

          <select
            className="form-input"
            value={profile.preferredIntakeSeason}
            onChange={(e) =>
              updateProfileField("preferredIntakeSeason", e.target.value)
            }
            disabled={!profile.preferredIntakeYear}
          >
            <option value="">
              {profile.preferredIntakeYear
                ? "Select season"
                : "Select year first"}
            </option>

            {intakes.map((intake) => {
              const disabled = isIntakeDisabled(
                intake.endMonth,
                profile.preferredIntakeYear
              );

              return (
                <option
                  key={intake.value}
                  value={intake.value}
                  disabled={disabled}
                >
                  {intake.label}
                  {disabled ? " — passed" : ""}
                </option>
              );
            })}
          </select>
        </div>
      </div>
    </div>
  );
}

function MultiSelectGroup({
  label,
  options,
  selected,
  onToggle,
  disabled = false,
  emptyText = "No options available",
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  disabled?: boolean;
  emptyText?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <div className="flex flex-wrap gap-2">
        {disabled || options.length === 0 ? (
          <p className="text-sm text-slate-400">{emptyText}</p>
        ) : (
          options.map((option) => {
            const isSelected = selected.includes(option);

            return (
              <button
                key={option}
                type="button"
                onClick={() => onToggle(option)}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  isSelected
                    ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300"
                }`}
              >
                {option}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
