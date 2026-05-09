import MatchScoreMeter from "./MatchScoreMeter";

type CourseCardProps = {
  title: string;
  university: string;
  location: string;
  tuition: string;
  duration: string;
  intake: string;
  ielts: string;
  score: number;
};

export default function CourseCard({
  title,
  university,
  location,
  tuition,
  duration,
  intake,
  ielts,
  score,
}: CourseCardProps) {
  return (
    <article className="rounded-2xl bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            {title}
          </h3>

          <p className="mt-1 text-sm font-medium text-slate-600">
            {university}
          </p>

          <p className="text-sm text-slate-500">{location}</p>
        </div>

        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">
          {score}
        </div>
      </div>

      <div className="mb-5">
        <MatchScoreMeter score={score} />
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <Info label="Tuition" value={tuition} />
        <Info label="Duration" value={duration} />
        <Info label="Intake" value={intake} />
        <Info label="IELTS" value={ielts} />
      </div>

      <div className="mt-5 flex gap-3">
        <button className="flex-1 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">
          View Details
        </button>

        <button className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">
          Shortlist
        </button>
      </div>
    </article>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-1 font-semibold text-slate-800">
        {value}
      </p>
    </div>
  );
}