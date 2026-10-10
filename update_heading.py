import re

with open("src/pages/Index.tsx", "r") as f:
    content = f.read()

# 1. Replace the heading HTML
old_hero_title = '''<h1 className="hero-title">
              Take control<br />
              of your{' '}
              <span className="gradient-text">hyperhidrosis</span>
            </h1>'''

new_hero_title = '''<h1 className="hero-title">
              <span className="title-line-1">Take Control</span><br />
              <span className="title-line-2">of your hyperhidrosis</span>
            </h1>'''
content = content.replace(old_hero_title, new_hero_title)

# 2. Insert CSS classes for title-line-1 and title-line-2
css_to_inject = """
    .title-line-1 {
      color: #ffffff;
      font-weight: 800;
    }
    .title-line-2 {
      background: linear-gradient(135deg, #a78bfa 0%, #d946ef 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      display: inline-block;
      font-weight: 800;
    }
"""

if ".title-line-1 {" not in content:
    content = content.replace('.gradient-text {', css_to_inject + '\n    .gradient-text {')


# 3. Add responsive sizing for the title lines on mobile
mobile_title_css = '''      .hero-title {
        font-size: 36px;
        line-height: 1.15;
      }

      .title-line-1, .title-line-2 {
        display: block;
      }'''

content = content.replace('''      .hero-title {
        font-size: 42px;
      }''', mobile_title_css)

with open("src/pages/Index.tsx", "w") as f:
    f.write(content)
