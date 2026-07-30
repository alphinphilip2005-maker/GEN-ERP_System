import { Component } from '@angular/core';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.css']
})
export class AdminLayoutComponent {
  user = {
    name: 'Muralidharan',
    email: 'muralidharan@genex.com',
    avatar: 'https://i.pravatar.cc/150?img=11'
  };
}
