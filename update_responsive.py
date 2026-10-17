import re

with open("src/pages/Index.tsx", "r") as f:
    content = f.read()

# Make sure buttons stack properly and don't overflow on really small screens
mobile_buttons_css_old = '''      .btn-primary-lg,
      .btn-outline-lg {
        padding: 14px 32px;
        font-size: 15px;
        width: 100%;
      }'''

mobile_buttons_css_new = '''      .hero-ctas {
        flex-direction: column;
        gap: 12px;
        width: 100%;
        max-width: 320px;
        margin-left: auto;
        margin-right: auto;
      }
      .btn-primary-lg,
      .btn-outline-lg {
        padding: 14px 32px;
        font-size: 15px;
        width: 100%;
        box-sizing: border-box;
        text-align: center;
      }'''

content = content.replace(mobile_buttons_css_old, mobile_buttons_css_new)


with open("src/pages/Index.tsx", "w") as f:
    f.write(content)
