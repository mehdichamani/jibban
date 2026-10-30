# Project Rules (قوانین پروژه جیب‌بان)

- **Auto Commit (کامیت خودکار)**:
  - پس از اتمام موفق هر وظیفه، تغییر کد، اصلاح باگ یا ایجاد اسناد، تغییرات باید به صورت خودکار کامیت شوند (`git add` و `git commit`) همراه با پیام کامیت مشخص و معنادار (بر اساس قراردادهای Conventional Commits مانند `feat:`, `fix:`, `docs:`, `refactor:`).
  - Always automatically create a git commit after completing tasks or making changes.

- **Remote Operations & Deployment Restrictions (محدودیت پوش و دیپلوی)**:
  - هرگونه عملیات ریموت شامل `git push` به گیت‌هاب یا هر سرور ریموت دیگر، تریگر یا اجرای بیلد در GitHub Actions، و هرگونه دیپلوی در کلادفلر (`wrangler deploy`, Cloudflare Pages / Workers / D1 migrations on remote) **اکیداً ممنوع** است، **مگر اینکه کاربر در پیام خود صراحتاً و مستقیماً دستور اجرای آن را داده باشد**.
  - NEVER execute `git push`, trigger GitHub Actions CI/CD builds, deploy to Cloudflare, or push changes to remote environments unless explicitly requested by the user in their message.
