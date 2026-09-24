/**
 * Footer – dark teal, 4 columns: Admin Portal, Quick Links, Resources, Contact.
 * Theme tokens only.
 */
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Users } from 'lucide-react';
import { useAuthContext } from '../../auth/AuthContext';

export default function Footer() {
  const { role } = useAuthContext();

  return (
    <footer
      className="mt-auto border-t border-white/10"
      style={{ backgroundColor: 'var(--color-header-footer)' }}
    >
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-white" />
              <h3 className="font-semibold text-white">Admin Portal</h3>
            </div>
            <p className="mt-2 text-sm font-medium text-white/90">Hospital Management</p>
            <p className="mt-1 text-sm text-white/80">
              Comprehensive system management dashboard for healthcare facilities.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-white">Quick Links</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link to={role === 'Admin' ? '/admin' : '/'} className="text-sm text-white/80 hover:text-white">
                  Dashboard
                </Link>
              </li>
              {role === 'Admin' && (
                <>
                  <li>
                    <Link to="/admin/patients" className="text-sm text-white/80 hover:text-white">
                      Patient Records
                    </Link>
                  </li>
                  <li>
                    <Link to="/admin/reports" className="text-sm text-white/80 hover:text-white">
                      Reports & Export
                    </Link>
                  </li>
                  <li>
                    <Link to="/admin/users" className="text-sm text-white/80 hover:text-white">
                      User Management
                    </Link>
                  </li>
                  <li>
                    <Link to="/admin/doctors" className="text-sm text-white/80 hover:text-white">
                      Doctor Management
                    </Link>
                  </li>
                  <li>
                    <Link to="/admin/roles" className="text-sm text-white/80 hover:text-white">
                      Role Assignment
                    </Link>
                  </li>
                  <li>
                    <Link to="/admin/audit-logs" className="text-sm text-white/80 hover:text-white">
                      Audit Trail
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-white">Resources</h3>
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              <li><Link to="/admin" className="hover:text-white">ICU Beds</Link></li>
              <li><Link to="/admin/roles" className="hover:text-white">Role Assignment</Link></li>
              <li><span className="cursor-default">Documentation</span></li>
              <li><span className="cursor-default">Support</span></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-white">Contact</h3>
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0" />
                +1 (555) 000-0000
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0" />
                admin@hospital.com
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0" />
                123 Healthcare Ave
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-white/10 pt-6 text-sm text-white/70 sm:flex-row">
          <span>© {new Date().getFullYear()} MEMON COMMUNITY HOSPITAL. All rights reserved.</span>
          <span>Powered by HMS</span>
        </div>
      </div>
    </footer>
  );
}
