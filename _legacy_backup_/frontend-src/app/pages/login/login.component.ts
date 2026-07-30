import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginData = {
    email: '',
    password: '',
    rememberMe: false
  };

  constructor(private router: Router) {}

  onSubmit() {
    console.log('Login attempt with', this.loginData);
    // In a real app we would call AuthService.login(this.loginData)
    // For now, simulate success and navigate inward
    this.router.navigate(['/admin/users']);
  }
}
