import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';

type SocialIcon = 'linkedin' | 'instagram' | 'web';

interface SocialLink {
  label: string;
  href: string;
  icon: SocialIcon;
}

@Component({
  selector: 'app-personal-card',
  standalone: true,
  imports: [CommonModule, NgOptimizedImage],
  templateUrl: './personal-card.page.html',
  styleUrl: './personal-card.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PersonalCardPage {
  protected readonly fullName = 'Sergio Nolasco';
  protected readonly role = 'CEO en Tecmeing';
  protected readonly whatsappNumber = '+51 922 926 088';
  protected readonly whatsappHref = 'https://wa.me/51922926088';
  protected readonly companyUrl = 'https://tecmeing.com/';
  protected readonly cardUrl = 'https://erpmomentum.com/sergio-nolasco';

  protected readonly socials = signal<SocialLink[]>([
    {
      label: 'LinkedIn',
      href: 'https://www.linkedin.com/in/sergio-nolasco-09b871393/',
      icon: 'linkedin',
    },
    {
      label: 'Instagram',
      href: 'https://www.instagram.com/mentor.snolasco/',
      icon: 'instagram',
    },
    { label: 'Tecmeing', href: this.companyUrl, icon: 'web' },
  ]);

  protected readonly qrSrc = computed(() => {
    const qrBase = 'https://api.qrserver.com/v1/create-qr-code/';
    const params = new URLSearchParams({
      size: '520x520',
      data: this.cardUrl,
      color: '000000',
      bgcolor: 'ffffff',
      margin: '0',
    });

    return `${qrBase}?${params.toString()}`;
  });

  protected trackSocial = (_index: number, item: SocialLink): string => item.label;
}

