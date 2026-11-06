"use client";

import { useState } from "react";

// A deliberately plain practice page for the extension team.
//
// Real job applications are messy, so this form copies the awkward parts on purpose:
// labels that don't say "name", a box React owns, a dropdown that isn't a <select>,
// a form inside a frame, yes/no buttons instead of radios, a date split into three
// boxes, and a file upload. Nothing is saved; submitting just shows the confirmation
// in the same page, so the URL never changes.

const DEGREES = ["Bachelor's", "Master's", "PhD", "Associate", "Other"];

// The framed form lives in its own document, which a content script only reaches when
// the manifest sets "all_frames": true. It's a string so this whole page stays one file.
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

  // The controlled box. Its value only changes through this state, so writing to the
  // DOM node directly gets undone the next time React renders.
  const [email, setEmail] = useState("");

  // The custom dropdown keeps its own open/closed state and the picked option, because
  // there's no native <select> underneath to do it for us.
  const [degree, setDegree] = useState("");
  const [degreeOpen, setDegreeOpen] = useState(false);

  // The yes/no buttons aren't form fields, so the answer lives in state too.
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
        {/* "Given Name" instead of "First name": the label doesn't match the field name,
            which is the usual reason a matcher misses it. */}
        <div>
          <label htmlFor="first_name" className={labelClass}>
            Given Name
          </label>
          <input id="first_name" name="first_name" className={inputClass} />
        </div>

        <div>
          <label htmlFor="last_name" className={labelClass}>
            Family Name
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

        {/* A dropdown built from buttons, not a <select>. It has to be clicked open, then
            clicked again to pick, so a matcher can't just set a value. */}
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

        {/* One date across three boxes. Each part is its own input, so they have to be
            filled separately and joined back into a real date. */}
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

        {/* Yes/no as buttons. There's no radio or checkbox to tick, so the answer only
            exists once one of them is clicked. */}
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
