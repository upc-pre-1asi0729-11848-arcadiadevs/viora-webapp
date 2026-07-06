import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

import {
  DashboardBreadcrumbItem,
  DashboardHeader,
} from '../../components/dashboard-header/dashboard-header';
import { ActiveSessionService } from '../../../infrastructure/active-session.service';

import {
  FAQ_ARTICLES,
  FAQ_CATEGORIES,
  FaqArticle,
  LEGAL_DOCUMENTS,
  LegalDocument,
} from '../../support-content';

type SupportTab = 'faq' | 'legal';

interface CategoryOption {
  label: string;
  count: number;
}

@Component({
  selector: 'app-support-overview',
  standalone: true,
  imports: [MatButtonModule, MatCardModule, MatIconModule, DashboardHeader, TranslatePipe],
  templateUrl: './support-overview.html',
  styleUrl: './support-overview.css',
})
export class SupportOverviewView {
  private readonly router = inject(Router);
  private readonly session = inject(ActiveSessionService);

  protected readonly legalDocuments = LEGAL_DOCUMENTS;
  protected readonly isSpecialist = this.session.isSpecialist;
  protected readonly articles = computed<FaqArticle[]>(() =>
    this.isSpecialist() ? this.specialistArticles() : FAQ_ARTICLES,
  );

  protected readonly activeTab = signal<SupportTab>('faq');

  // FAQ state.
  protected readonly search = signal('');
  protected readonly selectedCategory = signal<string>('all');
  protected readonly expandedId = signal<string | null>(null);

  // Legal state.
  protected readonly openDoc = signal<LegalDocument | null>(null);

  protected readonly breadcrumbs = computed<DashboardBreadcrumbItem[]>(() => [
    { label: 'Support', labelKey: 'supportPage.breadcrumb.support', disabled: true },
    {
      label: this.activeTab() === 'legal' ? 'Legal' : 'FAQ',
      labelKey: this.activeTab() === 'legal' ? 'supportPage.tabs.legal' : 'supportPage.tabs.faq',
      disabled: true,
    },
  ]);

  /** Category chips with live counts ("All articles" first). */
  protected readonly categories = computed<CategoryOption[]>(() => {
    const articleList = this.articles();
    const sourceCategories = this.isSpecialist()
      ? FAQ_CATEGORIES.map((category) =>
          category === 'Expert Assistance' ? 'Intervention Marketplace' : category,
        )
      : FAQ_CATEGORIES;
    const counts = sourceCategories.map((category) => ({
      label: category,
      count: articleList.filter((a) => a.category === category).length,
    }));
    return [{ label: 'All articles', count: articleList.length }, ...counts];
  });

  /** Articles filtered by selected category and search query. */
  protected readonly filteredArticles = computed<FaqArticle[]>(() => {
    const category = this.selectedCategory();
    const query = this.search().trim().toLowerCase();
    return this.articles().filter((article) => {
      const matchesCategory = category === 'all' || article.category === category;
      const matchesQuery =
        query.length === 0 ||
        article.question.toLowerCase().includes(query) ||
        article.answer.toLowerCase().includes(query);
      return matchesCategory && matchesQuery;
    });
  });

  protected readonly currentCategoryLabel = computed<string>(() =>
    this.selectedCategory() === 'all' ? 'All articles' : this.selectedCategory(),
  );

  protected selectTab(tab: SupportTab): void {
    this.activeTab.set(tab);
  }

  // ----- FAQ -----

  protected selectCategory(label: string): void {
    this.selectedCategory.set(label === 'All articles' ? 'all' : label);
    this.expandedId.set(null);
  }

  protected isCategoryActive(label: string): boolean {
    return (
      (label === 'All articles' && this.selectedCategory() === 'all') ||
      label === this.selectedCategory()
    );
  }

  protected toggleArticle(id: string): void {
    this.expandedId.update((current) => (current === id ? null : id));
  }

  // ----- Legal -----

  protected readFullDocument(doc: LegalDocument): void {
    this.openDoc.set(doc);
  }

  protected closeDocument(): void {
    this.openDoc.set(null);
  }

  // ----- Top cards -----

  protected goToExperts(): void {
    this.router.navigate([this.isSpecialist() ? '/specialist/marketplace' : '/expert-assistance']);
  }

  protected viewLegal(): void {
    this.activeTab.set('legal');
  }

  private specialistArticles(): FaqArticle[] {
    return FAQ_ARTICLES.map((article) => {
      if (article.category !== 'Expert Assistance') {
        return article;
      }
      if (article.id === 'assistance-response') {
        return {
          ...article,
          category: 'Intervention Marketplace',
          question: 'How do incoming Intervention Marketplace cases reach me?',
          answer:
            'Producer requests are routed to your Intervention Marketplace when the matching workflow assigns the case to your specialist account. You can review the producer context, decline if unavailable, or submit a service proposal from the marketplace card.',
        };
      }
      return {
        ...article,
        category: 'Intervention Marketplace',
        question: 'Can producers request me again after a previous intervention?',
        answer:
          'Yes. Once the producer-specialist loop is connected to real accounts, producers can return to specialists they have worked with before when you are available and relevant for the plot, alert, and service need.',
      };
    });
  }
}
