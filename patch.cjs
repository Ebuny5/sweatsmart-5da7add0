const fs = require('fs');

const loginContent = fs.readFileSync('src/pages/Login.tsx', 'utf8');
let newLogin = loginContent.replace(
  '{!showEmailForm ? (',
  ''
).replace(
  '              </div>\n            ) : (\n            <form onSubmit={handleLogin} className="space-y-4">',
  '              </div>\n\n            <div className="relative">\n              <div className="absolute inset-0 flex items-center">\n                <Separator className="w-full" />\n              </div>\n              <div className="relative flex justify-center text-xs uppercase">\n                <span className="bg-white px-2 text-muted-foreground">\n                  Or continue with email\n                </span>\n              </div>\n            </div>\n\n            <form onSubmit={handleLogin} className="space-y-4">'
).replace(
  '            </form>\n            )}\n          </CardContent>',
  '            </form>\n          </CardContent>'
).replace(
  'const [showEmailForm, setShowEmailForm] = useState(false);',
  ''
).replace(
  'onClick={() => setShowEmailForm(true)}',
  'onClick={(e) => { e.preventDefault(); document.getElementById("email")?.focus(); }}'
);
fs.writeFileSync('src/pages/Login.tsx', newLogin);

const registerContent = fs.readFileSync('src/pages/Register.tsx', 'utf8');
let newRegister = registerContent.replace(
  '{!showEmailForm ? (',
  ''
).replace(
  '              </div>\n            ) : (\n            <form onSubmit={handleRegister} className="space-y-4">',
  '              </div>\n\n            <div className="relative">\n              <div className="absolute inset-0 flex items-center">\n                <Separator className="w-full" />\n              </div>\n              <div className="relative flex justify-center text-xs uppercase">\n                <span className="bg-white px-2 text-muted-foreground">\n                  Or continue with email\n                </span>\n              </div>\n            </div>\n\n            <form onSubmit={handleRegister} className="space-y-4">'
).replace(
  '            </form>\n            )}\n          </CardContent>',
  '            </form>\n          </CardContent>'
).replace(
  'const [showEmailForm, setShowEmailForm] = useState(false);',
  ''
).replace(
  'onClick={() => setShowEmailForm(true)}',
  'onClick={(e) => { e.preventDefault(); document.getElementById("name")?.focus(); }}'
);
fs.writeFileSync('src/pages/Register.tsx', newRegister);
