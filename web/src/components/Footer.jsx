import { NavLink } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="sticky bottom-0 z-20 border-t border-white/10 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 text-sm text-slate-300 sm:px-6 lg:px-8">
        <p>Self investigation</p>
        <nav className="flex items-center gap-4">
          <NavLink to="/" className={({ isActive }) => (isActive ? 'text-white' : 'hover:text-white')}>
            Home
          </NavLink>
          <NavLink to="/about" className={({ isActive }) => (isActive ? 'text-white' : 'hover:text-white')}>
            About
          </NavLink>
        </nav>
      </div>
    </footer>
  )
}
