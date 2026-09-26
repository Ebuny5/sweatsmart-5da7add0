import re

with open("src/pages/Index.tsx", "r") as f:
    content = f.read()

trust_badge_old = '''.trust-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(167,139,250,0.15);
      border: 1px solid rgba(167,139,250,0.3);
      padding: 10px 20px;
      border-radius: 24px;
      font-size: 13px;
      font-weight: 500;
      color: #c4b5fd;
      margin-bottom: 28px;
      letter-spacing: 0.3px;
    }'''

trust_badge_new = '''.trust-badge {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: rgba(167,139,250,0.15);
      border: 1px solid rgba(167,139,250,0.3);
      padding: 12px 24px;
      border-radius: 30px;
      font-size: 16px;
      font-weight: 600;
      color: #e9d5ff;
      margin-bottom: 24px;
      letter-spacing: 0.5px;
    }'''
content = content.replace(trust_badge_old, trust_badge_new)

# make sure to center it on mobile via max-width 1024px rule
trust_badge_center = '''      .hero-subtitle {
        margin-left: auto;
        margin-right: auto;
      }
      .trust-badge {
        margin-left: auto;
        margin-right: auto;
      }'''
content = content.replace('''      .hero-subtitle {
        margin-left: auto;
        margin-right: auto;
      }''', trust_badge_center)


mobile_trust_badge_new = '''      .trust-badge {
        font-size: 14px;
        padding: 10px 20px;
        margin-bottom: 20px;
      }'''

mobile_hero_title = '''      .hero-title {
        font-size: 42px;
      }'''
content = content.replace(mobile_hero_title, mobile_trust_badge_new + '\n\n' + mobile_hero_title)

with open("src/pages/Index.tsx", "w") as f:
    f.write(content)
