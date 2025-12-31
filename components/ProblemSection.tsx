export default function ProblemSection() {
  const problems = [
    {
      icon: '📑',
      title: 'Too many tabs',
      description: 'Pool dashboard, WhatToMine, CoinGecko, electricity calculator... your browser looks like a trading floor.'
    },
    {
      icon: '💸',
      title: 'No net profit view',
      description: 'Pools show gross earnings. But after electricity costs, are you even profitable? Nobody tells you.'
    },
    {
      icon: '🔄',
      title: 'Miss coin switches',
      description: 'Profitability changes hourly. By the time you check, you\'ve already mined the wrong coin for days.'
    },
    {
      icon: '🔇',
      title: 'Silent failures',
      description: 'Rig went offline at 3am. You find out at dinner. That\'s 15 hours of lost mining.'
    }
  ]

  return (
    <section className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-primary">
            The Mining Dashboard Problem
          </h2>
          <p className="mt-4 text-lg text-foreground/70 max-w-2xl mx-auto">
            You got into mining to make money, not to become a spreadsheet jockey.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {problems.map((problem, index) => (
            <div
              key={index}
              className="flex gap-4 p-6 rounded-xl bg-background border border-gray-200 hover:border-warning/50 transition-colors"
            >
              <div className="text-3xl flex-shrink-0">{problem.icon}</div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {problem.title}
                </h3>
                <p className="text-foreground/70">
                  {problem.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
