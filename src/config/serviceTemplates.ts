export interface ServiceTemplate {
  serviceType: string;
  label: string;
  defaultPriceCents: number;
  priceRangeHint: string;
  defaultPaymentPlan: {
    type: 'full_upfront' | 'split' | 'milestones' | 'monthly_retainer';
    parts?: number[];
  };
  sowBlocks: {
    title: string;
    items: string[];
  }[];
  clauseCodes: string[];
}

export const serviceTemplates: ServiceTemplate[] = [
  {
    serviceType: 'website',
    label: 'Website Development',
    defaultPriceCents: 350000,
    priceRangeHint: '$2,500 to $8,000+',
    defaultPaymentPlan: {
      type: 'split',
      parts: [50, 50]
    },
    sowBlocks: [
      {
        title: 'Included Deliverables',
        items: [
          'Custom design and build',
          'Responsive layouts',
          'CMS setup',
          'Core pages',
          'Performance optimization',
          'Basic on-page SEO',
          'Contact or lead form',
          'Launch support'
        ]
      },
      {
        title: 'Exclusions',
        items: [
          'Copywriting unless included',
          'Hosting and domain fees',
          'Ongoing maintenance unless included',
          'Advanced SEO campaigns'
        ]
      },
      {
        title: 'Milestones',
        items: [
          'Discovery and structure approval',
          'Design approval',
          'Development',
          'QA and launch'
        ]
      }
    ],
    clauseCodes: ['W01', 'W02', 'W03', 'W04', 'W05', 'W06', 'W07', 'W08', 'W09']
  },
  {
    serviceType: 'landing_page',
    label: 'Landing Page',
    defaultPriceCents: 100000,
    priceRangeHint: '$750 to $1,500 per page',
    defaultPaymentPlan: {
      type: 'full_upfront'
    },
    sowBlocks: [
      {
        title: 'Included Deliverables',
        items: [
          'Single page layout',
          'Conversion-focused structure',
          'CTA and form integration',
          'Mobile optimization',
          'Speed optimization',
          'Analytics ready'
        ]
      },
      {
        title: 'Exclusions',
        items: [
          'Multi-page builds',
          'Complex backend logic',
          'Ad spend management'
        ]
      }
    ],
    clauseCodes: ['L01', 'L02', 'L03', 'L04', 'L05', 'L06']
  },
  {
    serviceType: 'web_app',
    label: 'Web App Development',
    defaultPriceCents: 800000,
    priceRangeHint: 'Custom scoped',
    defaultPaymentPlan: {
      type: 'split',
      parts: [40, 30, 30]
    },
    sowBlocks: [
      {
        title: 'Included Deliverables',
        items: [
          'Architecture planning',
          'UI and UX design',
          'Frontend development',
          'Backend logic or integrations',
          'Auth and user roles',
          'Database setup',
          'Staging and production deployment'
        ]
      },
      {
        title: 'Exclusions',
        items: [
          'Ongoing feature expansion',
          'Third-party fees',
          'Compliance certifications unless included'
        ]
      },
      {
        title: 'Milestones',
        items: [
          'Architecture and scope lock',
          'Design approval',
          'MVP build',
          'Testing and deployment'
        ]
      }
    ],
    clauseCodes: ['A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08']
  },
  {
    serviceType: 'brand_identity',
    label: 'Brand Identity',
    defaultPriceCents: 85000,
    priceRangeHint: '$450 to $1,500',
    defaultPaymentPlan: {
      type: 'full_upfront'
    },
    sowBlocks: [
      {
        title: 'Included Deliverables',
        items: [
          'Primary logo',
          'Logo variations',
          'Color palette',
          'Typography system',
          'Brand guidelines',
          'File exports for web and print'
        ]
      },
      {
        title: 'Exclusions',
        items: [
          'Trademark search unless included',
          'Website design unless included'
        ]
      }
    ],
    clauseCodes: ['B01', 'B02', 'B03', 'B04', 'B05', 'B06', 'B07']
  },
  {
    serviceType: 'seo',
    label: 'SEO Content and On-Page SEO',
    defaultPriceCents: 55000,
    priceRangeHint: '$550 per page or post',
    defaultPaymentPlan: {
      type: 'full_upfront'
    },
    sowBlocks: [
      {
        title: 'Included Deliverables',
        items: [
          'Keyword research',
          'SEO content writing',
          'Metadata and structure',
          'Internal linking',
          'Publishing support with access'
        ]
      },
      {
        title: 'Exclusions',
        items: [
          'Ranking guarantees',
          'Backlink campaigns unless included'
        ]
      }
    ],
    clauseCodes: ['S01', 'S02', 'S03', 'S04', 'S05', 'S06', 'S07']
  },
  {
    serviceType: 'graphic_design',
    label: 'Graphic Design',
    defaultPriceCents: 25000,
    priceRangeHint: '$150 to $500 per asset',
    defaultPaymentPlan: {
      type: 'full_upfront'
    },
    sowBlocks: [
      {
        title: 'Included Deliverables',
        items: [
          'Design assets per agreed count',
          'Platform sizing',
          'Exported web formats'
        ]
      },
      {
        title: 'Exclusions',
        items: [
          'Source files unless included',
          'Unlimited revisions'
        ]
      }
    ],
    clauseCodes: ['GFX01', 'GFX02', 'GFX03', 'GFX04', 'GFX05']
  },
  {
    serviceType: 'video_editing',
    label: 'Video Editing',
    defaultPriceCents: 50000,
    priceRangeHint: '$250 to $1,000 per video',
    defaultPaymentPlan: {
      type: 'full_upfront'
    },
    sowBlocks: [
      {
        title: 'Included Deliverables',
        items: [
          'Edit per provided footage',
          'Basic motion overlays if included',
          'Branding overlays',
          'Platform exports'
        ]
      },
      {
        title: 'Exclusions',
        items: [
          'Licensed music unless included',
          'Filming and footage capture'
        ]
      }
    ],
    clauseCodes: ['V01', 'V02', 'V03', 'V04', 'V05']
  },
  {
    serviceType: 'retainer',
    label: 'Monthly Retainer',
    defaultPriceCents: 100000,
    priceRangeHint: 'Monthly billed in advance',
    defaultPaymentPlan: {
      type: 'monthly_retainer'
    },
    sowBlocks: [
      {
        title: 'Included Deliverables',
        items: [
          'Monthly scope bucket',
          'Priority support windows',
          'Reporting if included'
        ]
      },
      {
        title: 'Exclusions',
        items: [
          'Unused work rollover unless included',
          'Unlimited requests'
        ]
      }
    ],
    clauseCodes: ['R01', 'R02', 'R03', 'R04', 'R05']
  }
];

export const globalClauseCodes = [
  'G01', 'G02', 'G03', 'G04', 'G05', 'G06', 'G07', 'G08',
  'G09', 'G10', 'G11', 'G12', 'G13', 'G14', 'G15'
];

export function getServiceTemplate(serviceType: string): ServiceTemplate | undefined {
  return serviceTemplates.find(t => t.serviceType === serviceType);
}

export function getClauseCodesForServices(serviceTypes: string[]): string[] {
  const serviceClauses = serviceTypes.flatMap(type => {
    const template = getServiceTemplate(type);
    return template ? template.clauseCodes : [];
  });
  
  // Combine global + service clauses, dedupe
  const allCodes = [...globalClauseCodes, ...serviceClauses];
  return Array.from(new Set(allCodes));
}
