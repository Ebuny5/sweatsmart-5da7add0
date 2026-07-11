import re

with open("src/pages/Index.tsx", "r") as f:
    content = f.read()

# 1. Update Navigation Buttons
# Replacing the btn-ghost with btn-primary for Login
content = content.replace(
    '''<a href="/login" className="btn-ghost">Login</a>''',
    '''<a href="/login" className="btn-primary" style={{ background: 'rgba(124, 58, 237, 0.8)', boxShadow: 'none' }}>Login</a>'''
)

# 2. Update Nav responsive spacing and logo size
mobile_nav_old = '''    @media (max-width: 640px) {
      nav {
        height: 64px;
        padding: 0 4%;
      }

      .logo-img {
        width: 38px;
        height: 38px;
      }

      .logo-text {
        font-size: 18px;
      }

      .btn-ghost {
        padding: 9px 16px;
        font-size: 14px;
      }

      .btn-primary {
        padding: 9px 16px;
        font-size: 14px;
      }'''

mobile_nav_new = '''    @media (max-width: 640px) {
      nav {
        height: 64px;
        padding: 0 3%;
      }

      .nav-links {
        gap: 6px;
      }

      .logo {
        gap: 6px;
      }

      .logo-img {
        width: 28px;
        height: 28px;
      }

      .logo-text {
        font-size: 15px;
      }

      .btn-ghost {
        padding: 8px 12px;
        font-size: 13px;
      }

      .btn-primary {
        padding: 8px 12px;
        font-size: 13px;
      }'''

content = content.replace(mobile_nav_old, mobile_nav_new)


with open("src/pages/Index.tsx", "w") as f:
    f.write(content)
