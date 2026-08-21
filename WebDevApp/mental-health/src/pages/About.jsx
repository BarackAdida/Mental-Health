import '../Styles/About.css';

const team = [
  { name: 'Counseling Team', role: 'Licensed professionals from Strathmore`s Student Welfare office, verified and available on the platform.' },
  { name: 'Peer Volunteers', role: 'Trained Strathmore students who understand campus life and act as your first point of contact.' },
  { name: 'Tech & Product', role: 'A student-led team building and maintaining the platform right here at Strathmore.' },
];

const values = [
  { title: 'Anonymity first', body: 'We built the platform so that seeking help leaves no visible trace. No public bookings, no visible walk-ins.' },
  { title: 'Peer-led care', body: 'Professional support is essential, but often the first step is talking to someone who truly gets it — a fellow student.' },
  { title: 'Early intervention', body: 'We believe in catching stress, anxiety, and burnout before they become crises. Check-ins and nudges help people stay ahead.' },
  { title: 'University partnership', body: 'Built in partnership with the Student Welfare office — not around it. Counselors are embedded, not external.' },
];

function About() {
  return (
    <main className="about">

      <section className="about-hero">
        <div className="section-inner">
          <div className="section-label">Our Story</div>
          <h1>Mental health support that actually fits university life</h1>
          <p>Strathmore Mental Health was born out of a simple observation: Strathmore has the counselors, the Student Welfare office, and the will — but students weren't reaching out. Stigma, fear of being seen, and long wait times kept help out of reach.</p>
          <p>We set out to remove every barrier between a student in need and the support they deserve.</p>
        </div>
      </section>

      <section className="mission-section">
        <div className="section-inner mission-grid">
          <div className="mission-text">
            <div className="section-label">Mission</div>
            <h2>A campus where no student suffers alone</h2>
            <p>We exist to make mental healthcare at Strathmore University as normal and accessible as visiting the library. Anonymous, available, and built for students — not for institutions.</p>
          </div>
          <div className="mission-quote">
            <blockquote>
              "Ut omnes unum sint."
              <cite>— Strathmore University Motto: That all may be one</cite>
            </blockquote>
          </div>
        </div>
      </section>

      <section className="values-section">
        <div className="section-inner">
          <div className="section-label">What We Stand For</div>
          <h2>Our values</h2>
          <div className="values-grid">
            {values.map((v, i) => (
              <div key={i} className="value-card">
                <div className="value-num">0{i + 1}</div>
                <h3>{v.title}</h3>
                <p>{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="team-section">
        <div className="section-inner">
          <div className="section-label">Who's Behind Strathmore Mental Health</div>
          <h2>Built with Strathmore, for Strathmore</h2>
          <div className="team-grid">
            {team.map((t, i) => (
              <div key={i} className="team-card">
                <div className="team-avatar">{t.name[0]}</div>
                <h3>{t.name}</h3>
                <p>{t.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </main>
  );
}

export default About;
