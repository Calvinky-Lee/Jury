import { IntakeForm } from "@/components/intake/IntakeForm";
import { Blob } from "@/components/hq/Blob";
import { BackgroundDoodles } from "@/components/BackgroundDoodles";

const PREVIEW_AVATARS = [
  { hue: "sky", form: "round" },
  { hue: "ember", form: "spiky" },
  { hue: "jade", form: "tall" },
  { hue: "magenta", form: "squat" },
] as const;

export default function Home() {
  return (
    <>
      <BackgroundDoodles />
      <div className="paper-grain" />
      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-10 px-4 py-16">
        <div className="flex items-center gap-3">
          {PREVIEW_AVATARS.map((avatar, i) => (
            <Blob key={avatar.hue} avatar={avatar} size={40} index={i} />
          ))}
        </div>

        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="font-hand text-5xl text-ink sm:text-6xl">The Council</h1>
          <p className="max-w-md font-sans text-ink-soft">
            File your case. The Chair convenes a council of 3–6 AI members, sized to the
            dilemma, to argue it out and deliver a verdict.
          </p>
        </div>

        <IntakeForm />
      </main>
    </>
  );
}
