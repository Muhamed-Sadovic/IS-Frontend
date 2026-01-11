import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { Register } from './components/register/register';
import { Dashboard } from './components/dashboard/dashboard';
import { Home } from './components/home/home';
import { UserTable } from './components/user-table/user-table';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'dashboard', component: Dashboard },
  { path: 'home', component: Home },
  { path: 'user-table', component: UserTable },
  { path: '', redirectTo: 'home', pathMatch: 'full' },
];
