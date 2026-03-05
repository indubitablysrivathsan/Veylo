import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Outlet, useLocation, Navigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AppProvider } from '@/context/AppContext'
import { AuthProvider } from '@/context/AuthContext'
import { useAuth } from '@/hooks/useAuth'
import AmbientBackground from '@/components/shared/AmbientBackground'
import GlassSidebar from '@/components/shared/GlassSidebar'

// Lazy-load all pages
const Landing = lazy(() => import('@/pages/Landing'))
const Auth = lazy(() => import('@/pages/Auth'))
const ClientDashboard = lazy(() => import('@/pages/client/Dashboard'))
const CreateJob = lazy(() => import('@/pages/client/CreateJob'))
const ClientJobDetail = lazy(() => import('@/pages/client/JobDetail'))
const ValidationView = lazy(() => import('@/pages/client/ValidationView'))
const FreelancerDashboard = lazy(() => import('@/pages/freelancer/Dashboard'))
const Marketplace = lazy(() => import('@/pages/freelancer/Marketplace'))
const FreelancerJobDetail = lazy(() => import('@/pages/freelancer/JobDetail'))
const Reputation = lazy(() => import('@/pages/Reputation'))

/** Protected route — redirects to /auth if not logged in */
function ProtectedRoute() {
  const { state } = useAuth()

  if (state.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 spinner" />
      </div>
    )
  }

  if (!state.isAuthenticated) {
    return <Navigate to="/auth" replace />
  }

  return <Outlet />
}

function DashboardLayout() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-background">
      <AmbientBackground />
      <GlassSidebar />
      <main className="relative z-10 ml-[260px] p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}

const loadingFallback = (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="w-8 h-8 spinner" />
  </div>
)

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <Suspense fallback={loadingFallback}>
            <Routes>
              {/* Public */}
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reputation/:address" element={<Reputation />} />

              {/* Protected — Client */}
              <Route element={<ProtectedRoute />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/client" element={<ClientDashboard />} />
                  <Route path="/client/create" element={<CreateJob />} />
                  <Route path="/client/job/:id" element={<ClientJobDetail />} />
                  <Route path="/client/job/:id/validation" element={<ValidationView />} />
                  <Route path="/client/reputation" element={<Reputation />} />
                </Route>
              </Route>

              {/* Protected — Freelancer */}
              <Route element={<ProtectedRoute />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/freelancer" element={<FreelancerDashboard />} />
                  <Route path="/freelancer/marketplace" element={<Marketplace />} />
                  <Route path="/freelancer/job/:id" element={<FreelancerJobDetail />} />
                  <Route path="/freelancer/job/:id/validation" element={<ValidationView />} />
                  <Route path="/freelancer/reputation" element={<Reputation />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
