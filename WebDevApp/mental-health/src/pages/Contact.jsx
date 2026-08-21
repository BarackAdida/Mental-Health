import { useState } from 'react';
import '../Styles/Contact.css'

const contacts = [
  { icon: '🏛️', label: 'Student Welfare Office', value: 'Block C, Strathmore University', sub: 'Mon – Fri, 8am – 5pm' },
  { icon: '📧', label: 'Email', value: 'wellness@strathmore.edu', sub: 'We respond within 24 hours' },
  { icon: '📞', label: 'Crisis Line', value: '0722 000 000', sub: 'Available 24 / 7' },
];

function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSubmit(e) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <main className="contact">

      <section className="contact-hero">
        <div className="section-inner">
          <div className="section-label">Reach Out</div>
          <h1>We're here. Always.</h1>
          <p>Whether you need urgent support, want to learn more about the platform, or want to get involved — get in touch.</p>
        </div>
      </section>

      <section className="contact-body">
        <div className="section-inner contact-grid">

          <div className="contact-info">
            <h2>Contact details</h2>
            <div className="contact-cards">
              {contacts.map((c, i) => (
                <div key={i} className="contact-card">
                  <div className="contact-icon">{c.icon}</div>
                  <div>
                    <div className="contact-label">{c.label}</div>
                    <div className="contact-value">{c.value}</div>
                    <div className="contact-sub">{c.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="crisis-box">
              <div className="crisis-title">🆘 In immediate distress?</div>
              <p>Don't wait for a form response. Call the Strathmore crisis line now: <strong>0722 000 000</strong>. Someone is always available.</p>
            </div>
          </div>

          <div className="contact-form-wrap">
            {sent ? (
              <div className="form-success">
                <div className="success-icon">✅</div>
                <h3>Message received</h3>
                <p>Thank you for reaching out. Someone from the Strathmore Mental Health team or Student Welfare will be in touch within 24 hours.</p>
              </div>
            ) : (
              <form className="contact-form" onSubmit={handleSubmit}>
                <h2>Send a message</h2>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="name">Your name</label>
                    <input
                      id="name" name="name" type="text"
                      placeholder="e.g. Amina Ochieng"
                      value={form.name} onChange={handleChange} required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="email">Student email</label>
                    <input
                      id="email" name="email" type="email"
                      placeholder="you@strathmore.edu"
                      value={form.email} onChange={handleChange} required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="subject">Subject</label>
                  <select id="subject" name="subject" value={form.subject} onChange={handleChange} required>
                    <option value="">Select a topic</option>
                    <option value="support">I need mental health support</option>
                    <option value="booking">Help with booking a session</option>
                    <option value="peer">Becoming a peer volunteer</option>
                    <option value="institution">Institutional / partnership inquiry</option>
                    <option value="other">Something else</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="message">Message</label>
                  <textarea
                    id="message" name="message" rows="5"
                    placeholder="Tell us what's on your mind. There's no wrong thing to say."
                    value={form.message} onChange={handleChange} required
                  />
                </div>

                <button type="submit" className="btn-submit">Send message</button>
                <p className="form-note">Your message is confidential and will not be shared without your consent.</p>
              </form>
            )}
          </div>

        </div>
      </section>

    </main>
  );
}

export default Contact;
