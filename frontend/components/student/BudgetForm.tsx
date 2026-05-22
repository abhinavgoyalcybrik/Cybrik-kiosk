"use client";

import Slider from "rc-slider";
import "rc-slider/assets/index.css";

import { StudentProfile } from "@/hooks/useRecommendations";

type BudgetFormProps = {
  profile: StudentProfile;
  updateProfileField: (
    field: keyof StudentProfile,
    value: string | string[]
  ) => void;
};

const budgetOptions = Array.from({ length: 17 }, (_, index) => index * 5);

export default function BudgetForm({
  profile,
  updateProfileField,
}: BudgetFormProps) {
  const minBudget = Number(profile.budgetMinLakhs);
  const maxBudget = Number(profile.budgetMaxLakhs);

  const updateBudgetRange = (range: number | number[]) => {
    if (!Array.isArray(range)) return;

    updateProfileField("budgetMinLakhs", String(range[0]));
    updateProfileField("budgetMaxLakhs", String(range[1]));
  };

  const updateMinBudget = (value: string) => {
    const nextMin = Math.min(Number(value), maxBudget - 5);
    updateProfileField("budgetMinLakhs", String(nextMin));
  };

  const updateMaxBudget = (value: string) => {
    const nextMax = Math.max(Number(value), minBudget + 5);
    updateProfileField("budgetMaxLakhs", String(nextMax));
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-slate-700">
          Annual Tuition Budget
        </p>

        <p className="mt-1 text-2xl font-semibold text-slate-900">
          ₹{minBudget}L — ₹{maxBudget}L
        </p>

        <p className="mt-1 text-xs text-slate-500">
          Select a comfortable annual tuition range.
        </p>
      </div>

      <div className="rounded-2xl bg-slate-50 p-4">
        <Slider
          range
          min={0}
          max={80}
          step={5}
          value={[minBudget, maxBudget]}
          onChange={updateBudgetRange}
        />

        <div className="mt-3 flex justify-between text-xs text-slate-400">
          <span>₹0L</span>
          <span>₹80L</span>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <select
          className="form-input"
          value={minBudget}
          onChange={(e) => updateMinBudget(e.target.value)}
        >
          {budgetOptions
            .filter((value) => value < maxBudget)
            .map((value) => (
              <option key={value} value={value}>
                Min ₹{value}L
              </option>
            ))}
        </select>

        <span className="text-sm font-medium text-slate-400">to</span>

        <select
          className="form-input"
          value={maxBudget}
          onChange={(e) => updateMaxBudget(e.target.value)}
        >
          {budgetOptions
            .filter((value) => value > minBudget)
            .map((value) => (
              <option key={value} value={value}>
                Max ₹{value}L
              </option>
            ))}
        </select>
      </div>
    </div>
  );
}
