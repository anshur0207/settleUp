import { Link } from 'react-router-dom';

export default function SettleUpHomepage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-emerald-100 text-gray-900 overflow-hidden">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 md:px-16 py-5 sticky top-0 bg-white/80 backdrop-blur-lg z-50 border-b border-emerald-100">
        <div className="flex items-center gap-3">
          <img src="/logo.png?v=1" alt="SettleUp Logo" className="w-11 h-11 object-contain" />
          <h1 className="text-2xl font-bold tracking-tight">
            Settle<span className="text-emerald-500">Up</span>
          </h1>
        </div>

        <div className="hidden md:flex items-center gap-10 text-sm font-medium">
          <a href="#features" className="hover:text-emerald-500 transition">Features</a>
          <a href="#how" className="hover:text-emerald-500 transition">How it Works</a>
          <a href="#reviews" className="hover:text-emerald-500 transition">Reviews</a>
          <a href="#download" className="hover:text-emerald-500 transition">Download</a>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/login" className="hidden md:block px-5 py-2 rounded-xl border border-emerald-200 hover:bg-emerald-50 transition">
            Login
          </Link>
          <Link to="/signup" className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg transition">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-6 md:px-16 pt-16 md:pt-24 pb-24">
        <div className="grid md:grid-cols-2 gap-14 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium mb-6 shadow-sm">
              🚀 Smart Expense Splitting App
            </div>

            <h1 className="text-5xl md:text-7xl font-black leading-tight tracking-tight">
              Split Bills.
              <br />
              Travel Together.
              <br />
              <span className="text-emerald-500">Settle Instantly.</span>
            </h1>

            <p className="mt-8 text-lg text-gray-600 max-w-xl leading-relaxed">
              Track group expenses, bike trip costs, fuel sharing, food bills,
              and settlements with friends — all in one beautifully simple app.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mt-10">
              <Link to="/signup" className="px-8 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold shadow-xl transition">
                Start Splitting
              </Link>


            </div>

            <div className="flex items-center gap-10 mt-12">
              <div>
                <h2 className="text-3xl font-bold">50K+</h2>
                <p className="text-gray-500">Expenses Settled</p>
              </div>

              <div>
                <h2 className="text-3xl font-bold">10K+</h2>
                <p className="text-gray-500">Active Users</p>
              </div>

              <div>
                <h2 className="text-3xl font-bold">4.9★</h2>
                <p className="text-gray-500">User Rating</p>
              </div>
            </div>
          </div>

          {/* Mobile Mockup */}
          <div className="relative flex justify-center">
            <div className="absolute w-72 h-72 bg-emerald-300 rounded-full blur-3xl opacity-30"></div>

            <div className="relative w-[320px] h-[650px] rounded-[40px] border-[12px] border-gray-900 bg-white shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-80">Total Balance</p>
                    <h2 className="text-3xl font-bold mt-1">₹12,450</h2>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-xl">
                    💸
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="bg-emerald-50 rounded-3xl p-4 shadow-sm">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold">Goa Bike Trip</h3>
                      <p className="text-sm text-gray-500">Fuel + Hotel</p>
                    </div>
                    <div className="text-emerald-600 font-bold">+₹2,300</div>
                  </div>
                </div>

                <div className="bg-white border rounded-3xl p-4 shadow-sm">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold">Dinner Split</h3>
                      <p className="text-sm text-gray-500">4 friends</p>
                    </div>
                    <div className="text-red-500 font-bold">-₹450</div>
                  </div>
                </div>

                <div className="bg-white border rounded-3xl p-4 shadow-sm">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold">Fuel Expense</h3>
                      <p className="text-sm text-gray-500">Ride Sharing</p>
                    </div>
                    <div className="text-emerald-500 font-bold">+₹820</div>
                  </div>
                </div>

                <div className="mt-8 bg-gradient-to-r from-gray-900 to-black rounded-3xl p-5 text-white shadow-xl">
                  <p className="text-sm opacity-70">Quick Settle</p>
                  <h3 className="text-2xl font-bold mt-2">₹1,250 Pending</h3>
                  <button className="mt-4 w-full py-3 rounded-2xl bg-emerald-500 font-semibold hover:bg-emerald-600 transition">
                    Settle Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 md:px-16 py-24">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-black">Everything You Need</h2>
          <p className="mt-5 text-gray-600 max-w-2xl mx-auto text-lg">
            Designed for roommates, bike riders, travelers, friends, and teams.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              title: 'Smart Expense Split',
              desc: 'Equal, exact, percentage, and share-based splitting.',
              icon: '🧾',
            },
            {
              title: 'Trip Expense Tracking',
              desc: 'Perfect for bike rides, trips, fuel, hotels, and food.',
              icon: '🏍️',
            },
            {
              title: 'Realtime Settlements',
              desc: 'Instant balance updates with smart debt simplification.',
              icon: '⚡',
            },
            {
              title: 'Mobile First',
              desc: 'Fast, beautiful, and optimized for mobile devices.',
              icon: '📱',
            },
            {
              title: 'Group Management',
              desc: 'Create groups for trips, flats, parties, and more.',
              icon: '👥',
            },
            {
              title: 'Analytics Dashboard',
              desc: 'Visual charts and monthly spending insights.',
              icon: '📊',
            },
          ].map((feature, index) => (
            <div
              key={index}
              className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition duration-300"
            >
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center text-3xl mb-6">
                {feature.icon}
              </div>
              <h3 className="text-2xl font-bold">{feature.title}</h3>
              <p className="mt-4 text-gray-600 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 md:px-16 pb-24">
        <div className="relative overflow-hidden rounded-[40px] bg-gradient-to-r from-emerald-500 to-teal-500 p-12 md:p-20 text-white shadow-2xl">
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>

          <div className="relative z-10 max-w-3xl">
            <h2 className="text-5xl font-black leading-tight">
              Stop Confusing Group Expenses.
            </h2>
            <p className="mt-6 text-lg text-white/90 leading-relaxed">
              SettleUp helps you manage every rupee with your friends — from
              chai breaks to long bike trips.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mt-10">


              <button className="px-8 py-4 rounded-2xl border border-white/30 hover:bg-white/10 font-semibold transition">
                Explore Features
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-10 px-6 md:px-16 bg-white">
        <div className="flex flex-col md:flex-row justify-between gap-8">
          <div>
            <div className="flex items-center gap-3">
              <img src="/logo.png?v=1" alt="SettleUp Logo" className="w-10 h-10 object-contain" />
              <h2 className="text-2xl font-bold">
                Settle<span className="text-emerald-500">Up</span>
              </h2>
            </div>
            <p className="mt-4 text-gray-500 max-w-sm">
              The modern way to split expenses with friends and travel groups.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-10 text-sm">
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-500">
                <li>Features</li>
                <li>Groups</li>
                <li>Analytics</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-500">
                <li>About</li>
                <li>Careers</li>
                <li>Contact</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-gray-500">
                <li>Privacy</li>
                <li>Terms</li>
                <li>Security</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-gray-100 pt-6 text-sm text-gray-400 text-center">
          © 2026 SettleUp. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
