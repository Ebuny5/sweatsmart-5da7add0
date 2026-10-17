import re

with open("src/pages/Index.tsx", "r") as f:
    content = f.read()

# 1. Adjust Hero padding
section_hero_old = '''.section-hero {
      min-height: 90vh;
      display: flex;
      align-items: center;
      padding-top: 100px;
      padding-bottom: 60px;
    }'''

section_hero_new = '''.section-hero {
      min-height: 90vh;
      display: flex;
      align-items: center;
      padding-top: 70px;
      padding-bottom: 60px;
    }'''
content = content.replace(section_hero_old, section_hero_new)

# 2. Add centered layout for hero grid on smaller screens (below 1024px)
responsive_1024_old = '''    @media (max-width: 1024px) {
      .hero-grid {
        grid-template-columns: 1fr;
        gap: 50px;
      }
    }'''

responsive_1024_new = '''    @media (max-width: 1024px) {
      .hero-grid {
        grid-template-columns: 1fr;
        gap: 50px;
        text-align: center;
      }
      .hero-ctas {
        justify-content: center;
      }
      .hero-social-proof {
        justify-content: center;
      }
      .hero-subtitle {
        margin-left: auto;
        margin-right: auto;
      }
    }'''
content = content.replace(responsive_1024_old, responsive_1024_new)

# Reduce section-hero padding top further for mobile
mobile_hero_old = '''      .section-hero {
        padding-top: 80px;
      }'''

mobile_hero_new = '''      .section-hero {
        padding-top: 40px;
      }'''
content = content.replace(mobile_hero_old, mobile_hero_new)

with open("src/pages/Index.tsx", "w") as f:
    f.write(content)
