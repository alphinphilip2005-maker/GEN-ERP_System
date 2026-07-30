import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-add-user',
  templateUrl: './add-user.component.html',
  styleUrls: ['./add-user.component.scss']
})
export class AddUserComponent implements OnInit {
  addUserForm!: FormGroup;
  showRightsModal = false;

  constructor(private fb: FormBuilder, private router: Router) {}

  ngOnInit(): void {
    this.addUserForm = this.fb.group({
      name: ['', Validators.required],
      employeeId: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.pattern('^[0-9]+$')]],
      designation: ['', Validators.required],
      department: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(form: FormGroup) {
    return form.get('password')?.value === form.get('confirmPassword')?.value 
      ? null : { mismatch: true };
  }

  onSubmit(): void {
    if (this.addUserForm.valid) {
      console.log('Form Submit', this.addUserForm.value);
      // Calls userService to POST the data along with selected rights
      this.router.navigate(['/admin/users']);
    } else {
      this.addUserForm.markAllAsTouched();
    }
  }

  openRightsModal() {
    this.showRightsModal = true;
  }
}
