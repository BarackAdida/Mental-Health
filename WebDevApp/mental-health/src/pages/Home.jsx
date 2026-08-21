import { Link } from 'react-router-dom';
import '../Styles/Home.css';

const stats = [
  { number: '1 in 4', label: 'Kenyan university students experience anxiety or depression' },
  { number: '72%',    label: 'Never seek help due to stigma or lack of access' },
  { number: '5,000+', label: 'Strathmore students who deserve better support' },
];

const pillars = [
  {
    icon: '🔒',
    title: 'Fully Anonymous',
    desc: 'Book a counselor without anyone seeing you walk into an office. Your identity stays yours.',
  },
  {
    icon: '🤝',
    title: 'Peer Support',
    desc: 'Connect with trained fellow Strathmore students who understand campus life firsthand.',
  },
  {
    icon: '📱',
    title: 'Always Available',
    desc: 'Daily mood check-ins, crisis resources, and real-time counselor availability — in your pocket.',
  },
];

function Home() {
  return (
    <main className="home">

      {/* Hero */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-eyebrow">For Strathmore University Students</div>
          <h1>You don't have to carry this alone.</h1>
          <p>Strathmore Mental Health connects you to counselors, peers, and crisis support — anonymously, compassionately, and built for campus life.</p>
          <div className="hero-actions">
            <Link to="/how-it-works" className="btn-primary">See How It Works</Link>
            <Link to="/contact" className="btn-ghost">Talk to Someone Now</Link>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-card card-float">
            <div className="hcard-label">Today's check-in</div>
            <div className="mood-row">
              {['😔','😐','🙂','😊','😄'].map((e, i) => (
                <button key={i} className={`mood-btn ${i === 2 ? 'mood-selected' : ''}`}>{e}</button>
              ))}
            </div>
            <div className="hcard-note">How are you feeling today? It's okay to say.</div>
          </div>
          <div className="hero-card card-float card-delay">
            <div className="hcard-label">✅ Session booked</div>
            <p className="hcard-note">Your counselor appointment is confirmed for <strong>Thursday, 2pm</strong>. No one else can see this.</p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="stats-section">
        <div className="stats-inner">
          {stats.map((s, i) => (
            <div key={i} className="stat-item">
              <div className="stat-number">{s.number}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pillars */}
      <section className="pillars-section">
        <div className="section-inner">
          <div className="section-label">Why Strathmore Mental Health</div>
          <h2>Care that fits around your life at Strathmore</h2>
          <div className="pillars-grid">
            {pillars.map((p, i) => (
              <div key={i} className="pillar-card">
                <div className="pillar-icon">{p.icon}</div>
                <h3>{p.title}</h3>
                <p>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="cta-banner">
        <div className="section-inner">
          <h2>Students get help before crisis — not after.</h2>
          <p>Whether it's exam stress, homesickness, or something heavier — Strathmore Mental Health is here before it becomes overwhelming.</p>
          <Link to="/features" className="btn-primary">Explore the Platform</Link>
        </div>
      </section>

    </main>
  );
}

export default Home;
