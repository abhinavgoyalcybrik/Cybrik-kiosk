import { StudentProfile } from "@/hooks/useRecommendations";

type AcademicsFormProps = {
  profile: StudentProfile;
  updateProfileField: (
    field: keyof StudentProfile,
    value: string | string[]
  ) => void;
};

const boards = ["CBSE", "ICSE", "State Board", "NIOS", "IB", "Cambridge", "Other"];

const streams = [
  "Super-Medical",
  "Medical",
  "Non-Medical",
  "Commerce",
  "Arts",
];

const currentYear = new Date().getFullYear();

const completionYears = Array.from(
  { length: 21 },
  (_, index) => String(currentYear - index)
);

export default function AcademicsForm({
  profile,
  updateProfileField,
}: AcademicsFormProps) {
  const isTwelfthComplete =
    profile.twelfthBoard &&
    profile.twelfthPercentage &&
    profile.twelfthYearOfCompletion &&
    profile.twelfthStream;

  return (
    <div className="space-y-5">
      <SectionTitle title="10th Requirements" />

      <div className="grid grid-cols-2 gap-3">
        <SelectField
          label="Board"
          value={profile.tenthBoard}
          options={boards}
          placeholder="Select board"
          onChange={(value) => updateProfileField("tenthBoard", value)}
        />

        <InputField
          label="Percentage"
          value={profile.tenthPercentage}
          placeholder="e.g. 85"
          onChange={(value) => updateProfileField("tenthPercentage", value)}
        />
      </div>

      <SectionTitle title="12th Requirements" />

      <SelectField
        label="Board"
        value={profile.twelfthBoard}
        options={boards}
        placeholder="Select board"
        onChange={(value) => updateProfileField("twelfthBoard", value)}
      />

      <div className="grid grid-cols-2 gap-3">
        <InputField
          label="Percentage"
          value={profile.twelfthPercentage}
          placeholder="e.g. 82"
          onChange={(value) => updateProfileField("twelfthPercentage", value)}
        />

        <SelectField
          label="Year"
          value={profile.twelfthYearOfCompletion}
          options={completionYears}
          placeholder="Select year"
          onChange={(value) =>
            updateProfileField("twelfthYearOfCompletion", value)
          }
        />
      </div>

      <SelectField
        label="Stream"
        value={profile.twelfthStream}
        options={streams}
        placeholder="Select stream"
        onChange={(value) => updateProfileField("twelfthStream", value)}
      />

      {isTwelfthComplete && (
        <>
          <SectionTitle title="Graduation, if any" />

          <InputField
            label="Degree"
            value={profile.graduationDegree}
            placeholder="e.g. B.Com, B.Tech, BCA"
            onChange={(value) => updateProfileField("graduationDegree", value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <InputField
              label="CGPA / Percentage"
              value={profile.graduationCgpa}
              placeholder="e.g. 7.8"
              onChange={(value) => updateProfileField("graduationCgpa", value)}
            />

            <SelectField
              label="Year"
              value={profile.graduationYearOfCompletion}
              options={completionYears}
              placeholder="Select year"
              onChange={(value) =>
                updateProfileField("graduationYearOfCompletion", value)
              }
            />
          </div>
        </>
      )}

      <SectionTitle title="English Proficiency" />

      <InputField
        label="IELTS Overall Score"
        value={profile.ieltsOverall}
        placeholder="e.g. 6.5"
        onChange={(value) => updateProfileField("ieltsOverall", value)}
      />
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <h4 className="border-b border-emerald-100 pb-2 text-sm font-semibold text-slate-800">
      {title}
    </h4>
  );
}

function InputField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <input
        className="form-input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
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
