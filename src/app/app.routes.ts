import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { Register } from './components/register/register';
import { Dashboard } from './components/dashboard/dashboard';
import { Home } from './components/home/home';
import { UserTable } from './components/user-table/user-table';
import { ProfileComponent } from './components/profile/profile';
import { ErrorPage } from './components/error-page/error-page';
import { AuthGuard } from './guards/auth-guard';

export const routes: Routes = [
  { path: 'home', component: Home },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'error', component: ErrorPage },
  {
    path: 'dashboard',
    component: Dashboard,
    canActivate: [AuthGuard],
  },
  {
    path: 'profile',
    component: ProfileComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'user-table',
    component: UserTable,
    canActivate: [AuthGuard],
  },
  { path: '**', redirectTo: '/error' },
];
