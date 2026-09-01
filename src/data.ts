import { BlogPost } from "./types";
import { ensureAnimatedSvg } from "./lib/svgUtils";

const RAW_PRELOADED_BLOGS: BlogPost[] = [
  {
    "id": "blog-test-1",
    "title": "Non-Hermitian Quantum Mechanics & Exceptional Points",
    "slug": "non-hermitian-quantum-mechanics",
    "excerpt": "Comprehensive study of PT-symmetric open quantum systems.",
    "content": "## Hamiltonian Dynamics\n\n$$\\hat{H} = \\begin{pmatrix} r e^{i\\theta} & J \\\\ J & r e^{-i\\theta} \\end{pmatrix}$$",
    "author": "Lucas Kempe",
    "date": "2026-08-30",
    "readingTime": "9 min read",
    "arxivLink": "https://arxiv.org/abs/2608.12345",
    "bannerSvg": "<svg><text>Quantum</text></svg>",
    "tags": [
      "Quantum Mechanics",
      "Spectral Theory"
    ],
    "views": 399,
    "timestamp": 1725000000000,
    "createdAt": 1725000000000
  },
  {
    "id": "blog-test-2",
    "title": "Symplectic Manifolds in Neural Optimal Control",
    "slug": "symplectic-manifolds-neural-control",
    "excerpt": "Geometric deep learning on symplectic differential equations.",
    "content": "## Symplectic 2-Form\n\n$$\\omega = \\sum_{i=1}^n dq_i \\wedge dp_i$$",
    "author": "Lucas Kempe",
    "date": "2026-08-31",
    "readingTime": "8 min read",
    "arxivLink": "https://arxiv.org/abs/2608.67890",
    "bannerSvg": "<svg><text>Geometry</text></svg>",
    "tags": [
      "Differential Geometry",
      "Control Theory"
    ],
    "views": 120,
    "timestamp": 1725100000000,
    "createdAt": 1725100000000
  }
];

const today = new Date();
const formatDate = (d: Date) => {
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
};

export const PRELOADED_BLOGS: BlogPost[] = RAW_PRELOADED_BLOGS.map((blog, index) => {
  const d = new Date(today);
  if (index === 0) {
    // Today
  } else if (index === 1 || index === 2) {
    // Yesterday
    d.setDate(today.getDate() - 1);
  } else if (index === 3 || index === 4) {
    // 2 days ago
    d.setDate(today.getDate() - 2);
  } else {
    // Older
    d.setDate(today.getDate() - (index - 1));
  }
  return {
    ...blog,
    bannerSvg: ensureAnimatedSvg(blog.bannerSvg),
    date: blog.date || formatDate(d)
  };
});
