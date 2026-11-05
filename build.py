import os, re, shutil
S='src'
read=lambda f: open(os.path.join(S,f),encoding='utf-8').read()
parts={'lib':read('engine.js')+'\n'+read('ai.js')+'\n'+read('gen.js'),'content':read('lessons.js')+'\n'+read('problems.js'),'ldbank':read('ld_bank.js'),'classic':read('classic_data.js'),'app':read('app.js')}
shell=read('index.src.html')
shell=re.sub(r'<!--INCLUDE:engine-->\n<!--INCLUDE:ai-->\n<!--INCLUDE:lessons-->\n<!--INCLUDE:problems-->\n<!--INCLUDE:app-->','<!--INC:lib-->\n<!--INC:content-->\n<!--INC:ldbank-->\n<!--INC:classic-->\n<!--INC:app-->',shell)
assert '<!--INC:lib-->' in shell
shutil.rmtree('out',ignore_errors=True); os.makedirs('out/gas')
# GAS project files
gas=shell
for k in parts: gas=gas.replace(f'<!--INC:{k}-->',f"<?!= include('{k}'); ?>")
open('out/gas/index.html','w',encoding='utf-8').write(gas)
for k,v in parts.items():
    assert '</script' not in v
    open(f'out/gas/{k}.html','w',encoding='utf-8').write('<script>\n'+v+'\n</script>\n')
open('out/gas/Code.gs','w',encoding='utf-8').write(read('Code.gs'))
# single-file preview
pre=shell
for k,v in parts.items(): pre=pre.replace(f'<!--INC:{k}-->','<script>\n'+v+'\n</script>')
open('out/preview.html','w',encoding='utf-8').write(pre)
for root,_,files in os.walk('out'):
    for f in files: assert f.isascii(), f; print(os.path.join(root,f), os.path.getsize(os.path.join(root,f)))
