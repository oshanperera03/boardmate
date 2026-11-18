import { Route, Routes } from 'react-router-dom'
import { ProtectedRoute, AuthenticatedRedirect } from './components/auth/ProtectedRoute'
import { AppLayout } from './components/layouts/AppLayout'
import { AdminDashboard, OwnerDetailsPage, OwnerRequestsPage, OwnersListPage, PropertyRequestsPage, RegisteredUsersPage } from './pages/AdminPages'
import { ForgotPasswordPage, LandingPage, LoginPage, RegistrationPage } from './pages/PublicPages'
import { OwnerRoomsPage, RoomDetailsPage, RoomFormPage } from './pages/RoomPages'
import { StudentPropertyDetailsPage, StudentSearchPage } from './pages/DiscoveryPages'
import { OwnerBookingsPage, StudentBookingsPage } from './pages/BookingPages'
import { NotificationsPage } from './pages/NotificationPages'
import {
  AccountSuspendedPage,
  OwnerDashboard,
  OwnerPendingPage,
  OwnerPropertiesPage,
  OwnerPropertyFormPage,
  OwnerStatusPage,
  ProfilePage,
  StudentDashboard,
  StudentSettingsPage,
} from './pages/RolePages'

function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-5">
      <div className="text-center"><p className="text-sm font-bold uppercase tracking-widest text-blue-700">404</p><h1 className="mt-2 text-2xl font-bold text-slate-900">Page not found</h1><a href="/" className="mt-4 inline-block text-sm font-semibold text-[#183b63]">Back to home</a></div>
    </main>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<AuthenticatedRedirect />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<RegistrationPage />} />
        <Route path="/owner/register" element={<RegistrationPage owner />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/owner/login" element={<LoginPage owner />} />
        <Route path="/admin/login" element={<LoginPage admin />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>
      <Route path="/account-suspended" element={<AccountSuspendedPage />} />

      <Route element={<ProtectedRoute role="student" />}>
        <Route element={<AppLayout />}>
          <Route path="/student" element={<StudentDashboard />} />
          <Route path="/student/search" element={<StudentSearchPage />} />
          <Route path="/student/properties/:propertyId" element={<StudentPropertyDetailsPage />} />
          <Route path="/student/bookings" element={<StudentBookingsPage />} />
          <Route path="/student/notifications" element={<NotificationsPage />} />
          <Route path="/student/profile" element={<ProfilePage />} />
          <Route path="/student/settings" element={<StudentSettingsPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute role="owner" ownerGate="pending" />}>
        <Route element={<AppLayout />}>
          <Route path="/owner/pending" element={<OwnerPendingPage />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute role="owner" ownerGate="status" />}>
        <Route element={<AppLayout />}>
          <Route path="/owner/status" element={<OwnerStatusPage />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute role="owner" ownerGate="approved" />}>
        <Route element={<AppLayout />}>
          <Route path="/owner" element={<OwnerDashboard />} />
          <Route path="/owner/properties" element={<OwnerPropertiesPage />} />
          <Route path="/owner/properties/new" element={<OwnerPropertyFormPage />} />
          <Route path="/owner/rooms" element={<OwnerRoomsPage />} />
          <Route path="/owner/rooms/new" element={<RoomFormPage />} />
          <Route path="/owner/rooms/:roomId" element={<RoomDetailsPage />} />
          <Route path="/owner/rooms/:roomId/edit" element={<RoomFormPage />} />
          <Route path="/owner/bookings" element={<OwnerBookingsPage />} />
          <Route path="/owner/notifications" element={<NotificationsPage />} />
          <Route path="/owner/profile" element={<ProfilePage owner />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute role="admin" />}>
        <Route element={<AppLayout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/requests" element={<OwnerRequestsPage />} />
          <Route path="/admin/properties" element={<PropertyRequestsPage />} />
          <Route path="/admin/owners/:uid" element={<OwnerDetailsPage />} />
          <Route path="/admin/users" element={<RegisteredUsersPage />} />
          <Route path="/admin/approved" element={<OwnersListPage status="approved" />} />
          <Route path="/admin/rejected" element={<OwnersListPage status="rejected" />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
