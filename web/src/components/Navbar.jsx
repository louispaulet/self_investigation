import { Link, NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Home' },
  { to: '/activity', label: 'Activity' },
  { to: '/deployments', label: 'Deployments' },
  { to: '/shipping', label: 'Shipping' },
  { to: '/about', label: 'About' },
]

export default function Navbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#07110f]/80 px-4 py-3 text-white shadow-lg shadow-black/10 backdrop-blur sm:px-6 lg:px-8">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <Link to="/" aria-label="Go to homepage" className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-[#020817] hover:border-teal-200/40">
          <img src={`${import.meta.env.BASE_URL}favicon.webp`} alt="" className="h-8 w-8 rounded-md" />
        </Link>
        <div className="flex max-w-[calc(100vw-5.5rem)] items-center gap-1 overflow-x-auto rounded-xl border border-white/10 bg-black/15 p-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                [
                  'shrink-0 rounded-lg px-2 py-2 text-sm font-medium transition sm:px-4',
                  isActive ? 'bg-white !text-[#07110f] shadow-sm shadow-black/20' : 'text-slate-300 hover:bg-white/10 hover:text-white',
                ].join(' ')
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </header>
  )
}
