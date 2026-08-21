import { useState } from 'react';
import '../Styles/Donate.css';

const amounts = [500, 1000, 2500, 5000];

const impact = [
  { icon: '🗓️', title: 'Counselor sessions', desc: "Subsidizes free sessions for students who can't afford the small platform fee." },
  { icon: '📰', title: 'Mental health newsletter', desc: 'Keeps the Basic subscription free for every student, every semester.' },
  { icon: '🎟️', title: 'Wellness events', desc: 'Funds workshops, peer training, and campus mental health days.' },
  { icon: '🆘', title: 'Crisis response', desc: 'Keeps the 24/7 crisis line staffed and accessible to all students.' },
];

function Donate() {
  const [selected, setSelected] = useState(1000);
  const [custom, setCustom] = useState('');
  const [frequency, setFrequency] = useState('once');
  const [paymentMethod, setPaymentMethod] = useState('mpesa');

  const [showAlert, setShowAlert] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  function handleAmountClick(amt) {
    setSelected(amt);
    setCustom('');
  }

  function handleCustomChange(e) {
    setCustom(e.target.value);
    setSelected(null);
  }

  const finalAmount = custom ? Number(custom) : (selected || 0);

  function handleSubmit() {
    if (finalAmount <= 0) {
      alert('Please select or enter a valid amount.');
      return;
    }
    setShowAlert(true);
  }

  function closeAlert() {
    setShowAlert(false);
  }

  function confirmPayment() {
    console.log(`Processing ${frequency} payment of KES ${finalAmount} via ${paymentMethod}`);
    setShowAlert(false);
    setShowSuccess(true);
  }

  function closeSuccess() {
    setShowSuccess(false);
  }

  return (
    <main className="donate">

      <section className="donate-body">
        <div className="section-inner donate-grid">

          <div className="donate-form-wrap">
            <h2>Make a gift</h2>

            <div className="freq-toggle">
              <button
                className={frequency === 'once' ? 'freq-btn active' : 'freq-btn'}
                onClick={() => setFrequency('once')}
              >
                One-time
              </button>
              <button
                className={frequency === 'monthly' ? 'freq-btn active' : 'freq-btn'}
                onClick={() => setFrequency('monthly')}
              >
                Monthly
              </button>
            </div>

            <div className="amount-grid">
              {amounts.map((amt) => (
                <button
                  key={amt}
                  className={selected === amt ? 'amount-btn active' : 'amount-btn'}
                  onClick={() => handleAmountClick(amt)}
                >
                  KES {amt.toLocaleString()}
                </button>
              ))}
            </div>

            <div className="custom-amount">
              <label htmlFor="custom">Or enter a custom amount</label>
              <div className="custom-input-wrap">
                <span>KES</span>
                <input
                  id="custom"
                  type="number"
                  min="1"
                  placeholder="0"
                  value={custom}
                  onChange={handleCustomChange}
                />
              </div>
            </div>

            <div className="payment-methods">
              <label>Payment method</label>
              <div className="payment-options">
                <button
                  className={paymentMethod === 'mpesa' ? 'payment-btn active' : 'payment-btn'}
                  onClick={() => setPaymentMethod('mpesa')}
                >
                  📱 M-Pesa
                </button>
                <button
                  className={paymentMethod === 'card' ? 'payment-btn active' : 'payment-btn'}
                  onClick={() => setPaymentMethod('card')}
                >
                  💳 Card
                </button>
                <button
                  className={paymentMethod === 'airtel' ? 'payment-btn active' : 'payment-btn'}
                  onClick={() => setPaymentMethod('airtel')}
                >
                  📲 Airtel Money
                </button>
              </div>
            </div>

            <button
              className="btn-primary donate-submit"
              onClick={handleSubmit}
              disabled={finalAmount <= 0}
            >
              Donate KES {Number(finalAmount).toLocaleString()} {frequency === 'monthly' ? '/ month' : ''}
              {' via ' + paymentMethod.toUpperCase()}
            </button>
            <p className="form-note">Payments are processed securely. You'll receive a confirmation and receipt by email.</p>
          </div>

          <div className="donate-impact">
            <h2>Where your gift goes</h2>
            <div className="impact-list">
              {impact.map((item, i) => (
                <div key={i} className="impact-item">
                  <div className="impact-icon">{item.icon}</div>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="org-box">
              <div className="org-title">🏛️ Prefer to give institutionally?</div>
              <p>NGOs, companies, and alumni groups can set up grants or recurring program funding directly with the Student Welfare office.</p>
            </div>
          </div>

        </div>
      </section>

      {showAlert && (
        <div className="alert-overlay" onClick={closeAlert}>
          <div className="alert-box" onClick={(e) => e.stopPropagation()}>
            <div className="alert-icon">✅</div>
            <h3 className="alert-title">Confirm your donation</h3>
            <div className="alert-body">
              <p>
                You are about to donate <strong>KES {finalAmount.toLocaleString()}</strong>
                {frequency === 'monthly' && <span> <strong>monthly</strong></span>}
                {' via '} <strong>{paymentMethod.toUpperCase()}</strong>.
              </p>
              <p className="alert-note">
                By confirming, you agree to our secure payment terms.
              </p>
            </div>
            <div className="alert-actions">
              <button className="alert-btn-secondary" onClick={closeAlert}>
                Cancel
              </button>
              <button className="alert-btn-primary" onClick={confirmPayment}>
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="alert-overlay" onClick={closeSuccess}>
          <div className="alert-box success-box" onClick={(e) => e.stopPropagation()}>
            <div className="alert-icon success-icon">✔️</div>
            <h3 className="alert-title success-title">Payment Successful!</h3>
            <div className="alert-body">
              <p>
                Your donation of <strong>KES {finalAmount.toLocaleString()}</strong>
                {frequency === 'monthly' && <span> <strong>monthly</strong></span>}
                {' via '} <strong>{paymentMethod.toUpperCase()}</strong> has been received.
              </p>
              <p className="alert-note success-note">
                Thank you for your generous support. A confirmation email will be sent shortly.
              </p>
            </div>
            <div className="alert-actions">
              <button className="alert-btn-primary success-btn" onClick={closeSuccess}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}

export default Donate;