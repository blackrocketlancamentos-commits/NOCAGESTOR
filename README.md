
# 🚀 NOCA Gestor - Publicando seu Aplicativo Online com GitHub Pages

Bem-vindo ao repositório do seu NOCA Gestor! Este guia irá mostrar, passo a passo, como publicar seu aplicativo na internet de forma **100% gratuita** usando o GitHub Pages. Ao final, você terá um link público (ex: `https://seu-usuario.github.io/NOCAGESTOR/`) que poderá compartilhar com sua equipe.

---

### ✅ Passo 1: Enviar os Arquivos do Aplicativo para cá

Seu repositório está pronto, mas vazio. O primeiro passo é "subir" todos os arquivos do NOCA Gestor para esta página.

1.  Na página principal do seu repositório (a que você printou), clique no link **"uploading an existing file"**.
    

2.  Uma nova tela aparecerá. **Arraste TODOS os arquivos e pastas** do nosso projeto para a área indicada. A lista completa inclui:
    - `index.html`
    - `index.tsx`
    - `App.tsx`
    - `metadata.json`
    - `README.md` (este arquivo!)
    - `appsscript.json`
    - `apps_script.gs`
    - `config.ts`
    - `types.ts`
    - `utils.ts`
    - A pasta `components` (e todo o seu conteúdo)
    - A pasta `hooks` (e todo o seu conteúdo)
    - A pasta `services` (e todo o seu conteúdo)

3.  Aguarde todos os arquivos carregarem.

4.  Role para baixo e clique no botão verde **"Commit changes"**.

### ✅ Passo 2: Ativar o GitHub Pages para Publicar o Site

Agora que os arquivos estão no repositório, vamos dizer ao GitHub para transformá-los em um site ao vivo.

1.  Na página principal do seu repositório, clique na aba **"Settings"** (ícone de engrenagem ⚙️).
    

2.  No menu lateral esquerdo, clique em **"Pages"**.

3.  Na seção "Build and deployment", em "Source", selecione **"Deploy from a branch"**.

4.  Em "Branch", certifique-se de que a branch **`main`** (ou `master`) está selecionada e a pasta está como **`/ (root)**.
    

5.  Clique em **"Save"**.

### ✅ Passo 3: Acessar seu Aplicativo Online!

É isso! O GitHub agora está publicando seu aplicativo.

1.  Aguarde de **1 a 5 minutos**. A primeira publicação pode demorar um pouco.
2.  Atualize a página ("Settings" > "Pages"). Você verá uma mensagem verde no topo dizendo: **"Your site is live at..."** com o seu link público!
    
3.  Clique no link para visitar seu NOCA Gestor online.

**Parabéns! É ESSE link que você deve salvar e compartilhar com seus funcionários.**

---

### 🔄 Como Atualizar o Aplicativo no Futuro?

Quando eu te enviar novas atualizações de código, o processo para atualizar o site é ainda mais simples:

1.  Volte para a página principal do repositório.
2.  Clique em **"Add file"** > **"Upload files"**.
3.  **Arraste apenas os arquivos que foram modificados**. O GitHub vai substituir as versões antigas pelas novas automaticamente.
4.  Clique em **"Commit changes"**.

Aguarde 1 ou 2 minutos, e seu site estará atualizado com as novas funcionalidades!
