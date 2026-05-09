import { StudentProfile } from "@/hooks/useRecommendations";

type WorkHistoryFormProps = {
  profile: StudentProfile;
  updateProfileField: (
    field: keyof StudentProfile,
    value: string | string[]
  ) => void;
};

const workExperienceOptions = ["No", "Yes"];

const experienceYears = [
  "Less than 1 year",
  "1 year",
  "2 years",
  "3 years",
  "4 years",
  "5+ years",
];

const industries = [
  "Information Technology",
  "Business / Finance",
  "Healthcare",
  "Engineering",
  "Education",
  "Hospitality",
  "Retail / Sales",
  "Other",
];

export default function WorkHistoryForm({
  profile,
  updateProfileField,
}: WorkHistoryFormProps) {
  const hasWorkExperience = profile.hasWorkExperience === "Yes";

  return (
    <div className="space-y-5">
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Does the student have work experience?
        </label>

        <div className="flex gap-2">
          {workExperienceOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => updateProfileField("hasWorkExperience", option)}
              className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                profile.hasWorkExperience === option
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-blue-300"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {hasWorkExperience && (
        <>
          <SelectField
            label="Work Experience Duration"
            value={profile.workExperienceYears}
            options={experienceYears}
            placeholder="Select duration"
            onChange={(value) =>
              updateProfileField("workExperienceYears", value)
            }
          />

          <SelectField
            label="Industry"
            value={profile.workIndustry}
            options={industries}
            placeholder="Select industry"
            onChange={(value) => updateProfileField("workIndustry", value)}
          />
        </>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Gap Justification / Additional Notes
        </label>

        <textarea
          className="form-input min-h-24 resize-none"
          placeholder="Explain academic/work gaps, if any"
          value={profile.gapJustification}
          onChange={(e) =>
            updateProfileField("gapJustification", e.target.value)
          }
        />
      </div>

      <button className="form-button">Save Work History</button>
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <select
        className="form-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{placeholder}</option>

        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}