import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-not-found',
  templateUrl: './not-found.page.html',
  styleUrls: ['./not-found.page.scss'],
})
export class NotFoundPage implements OnInit {

  constructor(private router: Router) { }

  ngOnInit() {
  }

  goHome() {
    this.router.navigate(['/tabs/dashboard']);
  }

  goBack() {
    window.history.back();
  }

  searchKnowledge() {
    this.router.navigate(['/tabs/knowledge']);
  }

}