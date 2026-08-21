import { Link } from 'react-router-dom';
import '../Styles/Home.css';

const steps = [
  {
    num: '1',
    title: 'Sign in with your student ID',
    desc: 'No new account needed. Your Strathmore student ID is all you need to access the platform. Your identity is never shared publicly.',
  },
  {
    num: '2',
    title: 'Do a quick mood check-in',
    desc: 'Takes 10 seconds. Tell us how you are feeling today. Over time, this helps us understand your patterns and flag when you might need extra support.',
  },
  {
    num: '3',
    title: 'Choose your type of support',
    desc: 'Want to talk to a counselor? Prefer a peer volunteer? Need urgent help right now? Pick the type of support that feels right for where you are.',
  },
  {
    num: '4',
    title: 'Book anonymously',
    desc: 'Select a time slot, confirm your booking, and get a private reminder. No one in your faculty, hostel, or friend group will know unless you tell them.',
  },
  {
    num: '5',
    title: 'Show up and be heard',
    desc: 'Attend your session — online or in person. After, you can rate the experience and track how you are feeling over time.',
  },
];

const faqs = [
  { q: 'Is my information shared with anyone at Strathmore?', a: 'No personally identifiable information is shared. Counselors only see your session booking, not your daily mood data. The Student Welfare team sees aggregate, anonymized trends only.' },
  { q: 'What if I need help urgently?', a: 'Use the Crisis Resource Finder from any page. It surfaces real-time contacts for on-campus counselors, the campus nurse, and external crisis lines — instantly.' },
  { q: 'Can I use this if I just want to vent anonymously?', a: 'Yes. The peer support feature connects you with a trained student listener. You do not have to commit to a formal session.' },
  { q: 'Is this only for serious mental health conditions?', a: 'Not at all. Exam stress, relationship issues, academic pressure, loneliness — all of it qualifies. You don’t need a diagnosis to deserve support.' },
];

function HowItWorks() {
  return (
    <main className="hiw">

      <section className="hiw-hero">
        <div className="section-inner">
          <div className="section-label">Simple by Design</div>
          <h1>Getting support should never be the hard part</h1>
          <p>We designed Strathmore Mental Health so that a student in distress at 11pm before a CAT can find help in under two minutes.</p>
        </div>
      </section>

      <section className="steps-section">
        <div className="section-inner">
          <div className="steps-list">
            {steps.map((s, i) => (
              <div key={i} className="step-row">
                <div className="step-num">{s.num}</div>
                <div className="step-body">
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="faq-section">
        <div className="section-inner">
          <div className="section-label">Common Questions</div>
          <h2>Good questions deserve honest answers</h2>
          <div className="faq-list">
            {faqs.map((f, i) => (
              <div key={i} className="faq-item">
                <h3>{f.q}</h3>
                <p>{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="hiw-cta">
        <div className="section-inner">
          <h2>Ready when you are.</h2>
          <p>You don’t have to be in crisis to reach out. Whenever you're ready — or even just curious — Strathmore Mental Health is here.</p>
          <Link to="/contact" className="btn-primary">Get Started</Link>
        </div>
      </section>

    </main>
  );
}

export default HowItWorks;
