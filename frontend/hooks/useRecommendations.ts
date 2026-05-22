"use client";

import { useMemo, useState } from "react";

export type StudentProfile = {
  fullName: string;
  email: string;
  phone: string;
  currentCity: string;

    preferredCountries: string[];
    preferredCities: string[];
    preferredFields: string[];
    preferredUniversity: string;
    preferredIntakeSeason: string;
    preferredIntakeYear: string;

tenthBoard: string;
tenthPercentage: string;

twelfthBoard: string;
twelfthPercentage: string;
twelfthYearOfCompletion: string;
twelfthStream: string;

graduationDegree: string;
graduationCgpa: string;
graduationYearOfCompletion: string;

ieltsOverall: string;

hasWorkExperience: string;
workExperienceYears: string;
workIndustry: string;
gapJustification: string;

budgetMinLakhs: string;
budgetMaxLakhs: string;
};

const initialProfile: StudentProfile = {
  fullName: "",
  email: "",
  phone: "",
  currentCity: "",

  preferredCountries: [],
  preferredCities: [],
  preferredFields: [],
  preferredUniversity: "",
  preferredIntakeSeason: "",
  preferredIntakeYear: "",

tenthBoard: "",
tenthPercentage: "",

twelfthBoard: "",
twelfthPercentage: "",
twelfthYearOfCompletion: "",
twelfthStream: "",

graduationDegree: "",
graduationCgpa: "",
graduationYearOfCompletion: "",

ieltsOverall: "",

hasWorkExperience: "",
workExperienceYears: "",
workIndustry: "",
gapJustification: "",

budgetMinLakhs: "0",
budgetMaxLakhs: "80",
};

export default function useRecommendations() {
  const [profile, setProfile] = useState<StudentProfile>(initialProfile);

  const updateProfileField = (
  field: keyof StudentProfile,
  value: string | string[]
) => {
  setProfile((currentProfile) => ({
    ...currentProfile,
    [field]: value,
  }));
};

  const completedFields = useMemo(() => {
    return (Object.keys(initialProfile) as Array<keyof StudentProfile>).filter(
      (field) => {
        const value = profile[field];
        const initialValue = initialProfile[field];

        if (Array.isArray(value) && Array.isArray(initialValue)) {
          return value.length > 0;
        }

        if (typeof value === "string" && typeof initialValue === "string") {
          if (!value.trim()) {
            return false;
          }

          return value !== initialValue;
        }

        return false;
      }
    ).length;
  }, [profile]);

  const totalFields = Object.keys(initialProfile).length;

  const completionPercentage = useMemo(() => {
    return Math.round((completedFields / totalFields) * 100);
  }, [completedFields, totalFields]);

  const confidenceLevel = useMemo(() => {
    if (completionPercentage >= 80) return "High";
    if (completionPercentage >= 45) return "Medium";
    return "Low";
  }, [completionPercentage]);

  return {
    profile,
    updateProfileField,
    completedFields,
    totalFields,
    completionPercentage,
    confidenceLevel,
  };
}
