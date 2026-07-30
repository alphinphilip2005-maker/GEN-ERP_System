import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.css']
})
export class UserListComponent {
  searchText: string = '';
  
  // Mock data representing the users in the screenshots.
  users = [
    { name: 'Muralidharan', empId: 'DCD45GR', designation: 'Team Lead' },
    { name: 'Muralidharan', empId: 'DCD45GR', designation: 'Team Lead' },
    { name: 'Muralidharan', empId: 'DCD45GR', designation: 'Team Lead' },
    { name: 'Muralidharan', empId: 'DCD45GR', designation: 'Team Lead' },
    { name: 'Muralidharan', empId: 'DCD45GR', designation: 'Team Lead' },
    { name: 'Muralidharan', empId: 'DCD45GR', designation: 'Team Lead' },
    { name: 'Muralidharan', empId: 'DCD45GR', designation: 'Team Lead' },
    { name: 'Muralidharan', empId: 'DCD45GR', designation: 'Team Lead' },
    { name: 'Muralidharan', empId: 'DCD45GR', designation: 'Team Lead' },
    { name: 'Muralidharan', empId: 'DCD45GR', designation: 'Team Lead' },
    { name: 'Muralidharan', empId: 'DCD45GR', designation: 'Team Lead' },
    { name: 'Muralidharan', empId: 'DCD45GR', designation: 'Team Lead' },
    { name: 'Muralidharan', empId: 'DCD45GR', designation: 'Team Lead' },
    { name: 'Muralidharan', empId: 'DCD45GR', designation: 'Team Lead' },
    { name: 'Muralidharan', empId: 'DCD45GR', designation: 'Team Lead' }
  ];

  onSearch(event: any) {
    this.searchText = event.target.value;
  }
}
