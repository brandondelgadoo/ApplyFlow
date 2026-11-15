"use client";

import { useState } from "react";

const DEGREES = ["Bachelor's", "Master's", "PhD", "Associate", "Other"];

// the manifest sets "all_frames": true
const FRAME_HTML = `<!doctype html>
<html>
  <body style="font-family: system-ui, sans-serif; padding: 8px">
    <p style="margin: 0 0 8px; font-size: 13px">
      This form is inside a frame, so it needs "all_frames": true.
    </p>
    <form>
      <label for="frame-name">Given Name</label><br />
      <input id="frame-name" name="first_name" />
      <br /><br />
      <label for="frame-email">Email</label><br />
      <input id="frame-email" name="email" type="email" />
    </form>
  </body>
</html>`;

const inputClass = "mt-1 w-full rounded border border-slate-300 px-2 py-1";
const labelClass = "block text-sm font-medium";

export default function TestForm() {
  const [submitted, setSubmitted] = useState(false);

  // The control box
  const [email, setEmail] = useState("");

  const [degree, setDegree] = useState("");
  const [degreeOpen, setDegreeOpen] = useState(false);

  //form fields
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  if (submitted) {
    return (
      <main className="mx-auto max-w-xl px-6 py-16">
        <h1 className="text-2xl font-bold">Thank you for applying</h1>
        <p className="mt-2 text-slate-600">Your application was received.</p>
        <button
          type="button"
          className="mt-6 rounded border border-slate-300 px-3 py-1 text-sm"
          onClick={() => setSubmitted(false)}
        >
          Fill it in again
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-2xl font-bold">Test application</h1>
      <p className="mt-1 text-sm text-slate-600">
        Internal practice form for the extension. Nothing is saved.
      </p>

      <form
        className="mt-8 space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(true);
        }}
      >
        <div>
          <label htmlFor="first_name" className={labelClass}>
            First Name
          </label>
          <input id="first_name" name="first_name" className={inputClass} />
        </div>

        <div>
          <label htmlFor="last_name" className={labelClass}>
            Last Name
          </label>
          <input id="last_name" name="last_name" className={inputClass} />
        </div>

        <div>
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className={inputClass}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <p className="mt-1 text-xs text-slate-500">
            React owns this value, so setting it directly is overwritten on the next render.
          </p>
        </div>

        <div>
          <label htmlFor="phone" className={labelClass}>
            Phone
          </label>
          <input id="phone" name="phone" type="tel" className={inputClass} />
        </div>

        <div>
          <label htmlFor="school" className={labelClass}>
            School
          </label>
          <input id="school" name="school" className={inputClass} />
        </div>

        <div>
          <label htmlFor="major" className={labelClass}>
            Major
          </label>
          <input id="major" name="major" className={inputClass} />
        </div>

        <div>
          <span className={labelClass} id="degree-label">
            Degree
          </span>
          <div className="relative mt-1">
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={degreeOpen}
              aria-labelledby="degree-label"
              className={`${inputClass} text-left`}
              onClick={() => setDegreeOpen((open) => !open)}
            >
              {degree || "Select a degree"}
            </button>
            {degreeOpen && (
              <ul
                role="listbox"
                aria-labelledby="degree-label"
                className="absolute z-10 mt-1 w-full rounded border border-slate-300 bg-white"
              >
                {DEGREES.map((option) => (
                  <li key={option} role="option" aria-selected={degree === option}>
                    <button
                      type="button"
                      className="block w-full px-2 py-1 text-left text-sm hover:bg-slate-100"
                      onClick={() => {
                        setDegree(option);
                        setDegreeOpen(false);
                      }}
                    >
                      {option}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* One date across three boxes. */}
        <div>
          <span className={labelClass}>Graduation date</span>
          <div className="mt-1 flex gap-2">
            <input
              aria-label="Graduation month"
              name="graduation_month"
              placeholder="MM"
              maxLength={2}
              inputMode="numeric"
              className="w-14 rounded border border-slate-300 px-2 py-1"
            />
            <input
              aria-label="Graduation day"
              name="graduation_day"
              placeholder="DD"
              maxLength={2}
              inputMode="numeric"
              className="w-14 rounded border border-slate-300 px-2 py-1"
            />
            <input
              aria-label="Graduation year"
              name="graduation_year"
              placeholder="YYYY"
              maxLength={4}
              inputMode="numeric"
              className="w-20 rounded border border-slate-300 px-2 py-1"
            />
          </div>
        </div>

        <div>
          <span className={labelClass}>Authorized to work in the US?</span>
          <div className="mt-1 flex gap-2" role="group" aria-label="Work authorization">
            {[true, false].map((value) => (
              <button
                key={String(value)}
                type="button"
                aria-pressed={authorized === value}
                className={`rounded border px-3 py-1 text-sm ${
                  authorized === value
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300"
                }`}
                onClick={() => setAuthorized(value)}
              >
                {value ? "Yes" : "No"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="about_you" className={labelClass}>
            Tell us about yourself
          </label>
          <textarea id="about_you" name="about_you" rows={4} className={inputClass} />
        </div>

        <div>
          <label htmlFor="why_us" className={labelClass}>
            Why do you want to work here?
          </label>
          <textarea id="why_us" name="why_us" rows={4} className={inputClass} />
        </div>

        <div>
          <label htmlFor="resume" className={labelClass}>
            Resume
          </label>
          <input id="resume" name="resume" type="file" accept=".pdf,.docx" className="mt-1" />
          <p className="mt-1 text-xs text-slate-500">
            An extension cannot set a file input, so this one can only be detected.
          </p>
        </div>

        <div>
          <span className={labelClass}>A form inside a frame</span>
          <iframe
            title="Form inside a frame"
            srcDoc={FRAME_HTML}
            className="mt-1 h-48 w-full rounded border border-slate-300"
          />
        </div>

        <button
          type="submit"
          className="rounded border border-slate-900 bg-slate-900 px-4 py-2 text-sm text-white"
        >
          Submit application
        </button>
      </form>
    </main>
  );
}
