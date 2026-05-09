import { StudentProfile } from "@/hooks/useRecommendations";

type GeneralInfoFormProps = {
  profile: StudentProfile;

  updateProfileField: (
    field: keyof StudentProfile,
    value: string
  ) => void;
};

export default function GeneralInfoForm({
  profile,
  updateProfileField,
}: GeneralInfoFormProps) {
  return (
    <div className="space-y-3">
      <input
        className="form-input"
        placeholder="Full name"
        value={profile.fullName}
        onChange={(e) =>
          updateProfileField("fullName", e.target.value)
        }
      />

      <input
        className="form-input"
        placeholder="Email"
        type="email"
        value={profile.email}
        onChange={(e) =>
          updateProfileField("email", e.target.value)
        }
      />

      <input
        className="form-input"
        placeholder="Phone number"
        value={profile.phone}
        onChange={(e) =>
          updateProfileField("phone", e.target.value)
        }
      />

      <input
        className="form-input"
        placeholder="Current city"
        value={profile.currentCity}
        onChange={(e) =>
          updateProfileField("currentCity", e.target.value)
        }
      />

      <button className="form-button">
        Save
      </button>
    </div>
  );
}