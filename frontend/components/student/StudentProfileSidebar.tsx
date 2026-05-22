"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import GeneralInfoForm from "./GeneralInfoForm";
import PreferencesForm from "./PreferencesForm";
import AcademicsForm from "./AcademicsForm";
import WorkHistoryForm from "./WorkHistoryForm";
import BudgetForm from "./BudgetForm";

import { StudentProfile } from "@/hooks/useRecommendations";

type StudentProfileSidebarProps = {
  profile: StudentProfile;

updateProfileField: (
  field: keyof StudentProfile,
  value: string | string[]
) => void;

  completionPercentage: number;
  confidenceLevel: string;
};

export default function StudentProfileSidebar({
  profile,
  updateProfileField,
  completionPercentage,
  confidenceLevel,
}: StudentProfileSidebarProps) {
  const sections = useMemo(() => [
    {
      title: "General Information",
      component: (
        <GeneralInfoForm
          profile={profile}
          updateProfileField={updateProfileField}
        />
      ),
    },
    {
      title: "Preferences",
      component: (
        <PreferencesForm
          profile={profile}
          updateProfileField={updateProfileField}
        />
      ),
    },
    {
      title: "Academics",
      component: (
        <AcademicsForm
          profile={profile}
          updateProfileField={updateProfileField}
        />
      ),
    },
    {
      title: "Work History / Gap Justification",
      component: (
        <WorkHistoryForm
          profile={profile}
          updateProfileField={updateProfileField}
        />
      ),
    },
    {
      title: "Budget",
      component: (
        <BudgetForm
          profile={profile}
          updateProfileField={updateProfileField}
        />
      ),
    },
  ], [profile, updateProfileField]);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    "General Information": true,
    Preferences: false,
    Academics: false,
    "Work History / Gap Justification": false,
    Budget: false,
  });

  return (
    <aside className="h-full w-full overflow-y-auto border-r border-slate-200 bg-white p-5">
      <div className="mb-6">
        <div className="mb-4">
          <Image
            src="/cybrik-logo.png"
            alt="Cybrik"
            width={150}
            height={44}
            priority
            className="h-11 w-auto object-contain"
          />
        </div>

        <p className="text-sm font-medium text-slate-500">
          Student Profile
        </p>

        <h2 className="mt-1 text-2xl font-semibold text-slate-900">
          Build your profile
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Add more details to improve recommendation accuracy.
        </p>

        <p className="mt-2 text-xs font-medium uppercase tracking-[0.12em] text-emerald-600">
          Live updates enabled
        </p>
      </div>

      <div className="mb-6 rounded-2xl bg-slate-50 p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-600">
            Profile Completion
          </span>

          <span className="text-sm font-semibold text-slate-900">
            {completionPercentage}%
          </span>
        </div>

        <div className="h-2 rounded-full bg-slate-200">
          <div
            className="h-2 rounded-full bg-emerald-600 transition-all duration-500"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Recommendation confidence: {confidenceLevel}
        </p>
      </div>

      <div className="space-y-3">
        {sections.map((section, index) => (
          <details
            key={section.title}
            open={openSections[section.title] ?? index === 0}
            onToggle={(event) => {
              const nextOpen = event.currentTarget.open;
              setOpenSections((currentSections) => ({
                ...currentSections,
                [section.title]: nextOpen,
              }));
            }}
            className="group rounded-xl border border-slate-200 bg-white p-4"
          >
            <summary className="cursor-pointer list-none text-sm font-semibold text-slate-800">
              <div className="flex items-center justify-between">
                <span>{section.title}</span>

                <span className="text-slate-400 transition group-open:rotate-180">
                  ⌄
                </span>
              </div>
            </summary>

            <div className="mt-4">
              {section.component}
            </div>
          </details>
        ))}
      </div>
    </aside>
  );
}
