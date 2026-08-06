export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <header className="mb-10">
          <h1 className="text-5xl font-bold">AaronOS</h1>
          <p className="text-neutral-400 mt-2">
            Your AI Powered Life Operating System
          </p>
        </header>

        {/* Stats */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-neutral-900 rounded-xl p-6">
            <p className="text-neutral-400">Level</p>
            <h2 className="text-3xl font-bold mt-2">1</h2>
          </div>

          <div className="bg-neutral-900 rounded-xl p-6">
            <p className="text-neutral-400">XP</p>
            <h2 className="text-3xl font-bold mt-2">0 / 500</h2>
          </div>

          <div className="bg-neutral-900 rounded-xl p-6">
            <p className="text-neutral-400">Today's XP</p>
            <h2 className="text-3xl font-bold mt-2">0</h2>
          </div>

          <div className="bg-neutral-900 rounded-xl p-6">
            <p className="text-neutral-400">Current Streak</p>
            <h2 className="text-3xl font-bold mt-2">0 Days</h2>
          </div>
        </section>

        {/* Today's Quests */}
        <section className="mt-12">
          <h2 className="text-2xl font-semibold mb-5">Today's Quests</h2>

          <div className="space-y-4">
            <div className="bg-neutral-900 rounded-xl p-5 flex justify-between items-center">
              <div>
                <h3 className="font-semibold">20 Min Cardio</h3>
                <p className="text-sm text-neutral-400">
                  Health • +40 XP
                </p>
              </div>

              <button className="bg-green-600 hover:bg-green-700 px-5 py-2 rounded-lg">
                Complete
              </button>
            </div>

            <div className="bg-neutral-900 rounded-xl p-5 flex justify-between items-center">
              <div>
                <h3 className="font-semibold">GitHub Commit</h3>
                <p className="text-sm text-neutral-400">
                  Career • +60 XP
                </p>
              </div>

              <button className="bg-green-600 hover:bg-green-700 px-5 py-2 rounded-lg">
                Complete
              </button>
            </div>

            <div className="bg-neutral-900 rounded-xl p-5 flex justify-between items-center">
              <div>
                <h3 className="font-semibold">Solve 2 LeetCode Problems</h3>
                <p className="text-sm text-neutral-400">
                  Learning • +80 XP
                </p>
              </div>

              <button className="bg-green-600 hover:bg-green-700 px-5 py-2 rounded-lg">
                Complete
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}