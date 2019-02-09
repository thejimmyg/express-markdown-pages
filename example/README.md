# Express Markdown Pages Example

You can test the example directly with:

```
cd ../
npm install
cd example
npm install
DEBUG="*" ROOT_DIR=markdown SIGN_IN_URL=/signin SIGN_OUT_URL=/signout SECRET='reallysecret' PORT=8000 npm start
```

To test the search integration (assuming you have a suitable server at http://localhost:8001/search):

```
SEARCH_AUTHORIZATION=123 SEARCH_INDEX_URL=http://localhost:8001/search DEBUG="*" ROOT_DIR=markdown SIGN_IN_URL=/signin SIGN_OUT_URL=/signout SECRET='reallysecret' PORT=8000 npm start
touch markdown/hello.md
```

The `SECRET` variable should be the same secret that express-mustache-jwt-signin uses for setting the user's cookie.

For production use you'll want to change the settings in the code, or use environment variables.


## Docker

Make sure you have installed Docker and Docker Compose for your platform, and
that you can customise your networking so that `www.example.localhost` can
point to `127.0.0.1`.

There is already a user file in `users/users.yaml` which the `signin` container can use. Edit it to change the usernames and passwords as you see fit.

**Tip: You can use a hased password too for the `password` field. Just visit `/user/hash` once the example is running to generarte the hash and then update the file.**

Make a directory where you can put your markdown and static files:

```
mkdir -p markdown
```

Create a file named `hello.md` inside the `markdown` directory for the server to find.

Make sure you change the `SECRET` variable everywhere, otherwise someone could forge your cookies and gain access to your system. You must use the same value for `SECRET` in each of the containers otherwise they won't recognose each other's cookies.

Docker can't copy files from a parent directory so the `docker:build` command puts the current dev version of express-markdown-pages in this directory and created a modified `package.json.docker`.

This example uses docker compose with a local HTTPS certificate. See `DOMAIN.md` for how to create a certificate yourself.

```
cd ../
rm package-lock.json
npm install
cd example
rm package-lock.json
npm install
npm run docker:run:local
npm run docker:logs:local
```

**Note: You'll need to set up your `/etc/hosts` so that `www.example.localhost` is mapped to `127.0.0.1`**

Visit https://www.example.localhost/hello. You'll probably need to get your browser
to accept the certficate since it is a self-signed one.

You can sign in using the credentials in `users/users.yml`.

As long as the user you sign in with has the `admin: true` claim in the `users/users.yaml` file, you should be able to view `.draft.md` files too at `.draft`, or view the `.md` files directly.

When you are finished you can stop the containers with the command below, otherwise Docker will automatically restart them each time you reboot (which is what you want in production, but perhaps not when you are developing):

```
npm run docker:stop:local
```

Visit https://www.example.localhost/hello to see the page rendered. You can sign in with `hello` and `world` to view the draft page at https://www.example.localhost/hello.draft.


## Dev

```
npm run fix
```
