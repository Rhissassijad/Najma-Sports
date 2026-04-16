export default function HowItWorks() {
  return (
    <section className="py-20 px-6 text-center">
      <h2 className="text-3xl font-bold mb-12">How it works</h2>

      <div className="grid md:grid-cols-3 gap-8">
        <div>
          <h3 className="text-xl font-semibold mb-2">1. Create Account</h3>
          <p>Sign up and set your profile.</p>
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-2">2. Join Matches</h3>
          <p>Compete with players near you.</p>
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-2">3. Improve</h3>
          <p>Track results and grow your rating.</p>
        </div>
      </div>
    </section>
  );
}