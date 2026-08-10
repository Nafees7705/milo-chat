import Link from "next/link";
import { LogoMark, BoltIcon, BookIcon, SpeakerIcon, MessageIcon } from "@/components/Icons";
import { ThemeToggle } from "@/components/ThemeToggle";

const FEATURES = [
  {
    icon: IconBolt,
    title: "Streams as it thinks",
    body: "Replies arrive token by token over Server-Sent Events, driven by the React Suspense boundary — no waiting on a spinner.",
  },
  {
    icon: IconMemory,
    title: "Remembers our talk",
    body: "Conversations carry a distilled long-term memory, so later questions feel contextual — not like talking to a stranger.",
  },
  {
    icon: IconVoice,
    title: "Talk instead of type",
    body: "Whisper into the box and Groq transcribes it; replies read themselves back aloud in your browser. Keyboard optional.",
  },
  {
    icon: IconRealtime,
    title: "Realtime by default",
    body: "A WebSocket channel keeps presence, typing and new replies in sync across every open tab.",
  },
];

export default function HomePage() {
  return (
    <div className="landing">
      <nav className="landing-nav">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="brand-mark">
            <LogoMark />
          </span>
          <span className="font-display" style={{ fontSize: 19, fontWeight: 650, letterSpacing: "-0.01em" }}>
            Milo
          </span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <ThemeToggle />
          <Link href="/chat" className="btn">
            Open chat
          </Link>
        </div>
      </nav>

      <section className="landing-hero">
        <p className="eyebrow">a chat that remembers · for internee.pk</p>
        <h1>
          A warm, <em>streaming</em> assistant that keeps its own notes.
        </h1>
        <p>
          Built on Groq, Clerk and MongoDB, Milo streams replies as it writes them,
          takes voice input, and quietly remembers what you told it earlier in the
          conversation. React Server Components keep the shell fast and honest.
        </p>
        <div className="landing-cta">
          <Link href="/chat" className="btn btn-accent" style={{ fontSize: 15, padding: "11px 20px" }}>
            Start chatting
          </Link>
          <a href="#how" className="btn">
            How it works
          </a>
        </div>
      </section>

      <section id="features" className="feature-row" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        {FEATURES.map((f) => (
          <div key={f.title} className="feature-card">
            <span className="mark">
              <f.icon width={17} height={17} />
            </span>
            <h3>{f.title}</h3>
            <p>{f.body}</p>
          </div>
        ))}
      </section>

      <section id="how" className="how">
        <p className="eyebrow">How it works</p>
        <h2>
          Three small steps,<br />
          one quiet assistant.
        </h2>
        <div className="how-steps">
          <article className="how-step">
            <span className="step-no">01</span>
            <h3>You talk</h3>
            <p>
              Type normally, or tap the mic and just speak — Whisper turns your
              words into text before you send.
            </p>
          </article>
          <article className="how-step">
            <span className="step-no">02</span>
            <h3>Milo streams back</h3>
            <p>
              Replies arrive token by token and render inside a React Suspense
              boundary. You watch it think, you stop it when you like.
            </p>
          </article>
          <article className="how-step">
            <span className="step-no">03</span>
            <h3>It remembers &amp; syncs</h3>
            <p>
              Every few turns a background note distils what matters. Chats live
              in MongoDB and echo across open tabs over a WebSocket.
            </p>
          </article>
        </div>
      </section>

      <footer style={{ padding: "24px 0 48px", display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", borderTop: "1px solid var(--hairline)", color: "var(--muted)", fontSize: 13 }}>
        <span>Milo · a Task 4 project for the internee.pk React internship.</span>
        <span>Groq · Clerk · MongoDB · Next.js</span>
      </footer>
    </div>
  );
}

function IconBolt({ width = 17, height = 17 }: { width?: number; height?: number }) {
  return <BoltIcon width={width} height={height} />;
}
function IconMemory({ width = 17, height = 17 }: { width?: number; height?: number }) {
  return <BookIcon width={width} height={height} />;
}
function IconVoice({ width = 17, height = 17 }: { width?: number; height?: number }) {
  return <SpeakerIcon width={width} height={height} />;
}
function IconRealtime({ width = 17, height = 17 }: { width?: number; height?: number }) {
  return <MessageIcon width={width} height={height} />;
}