# Domain

For local testing, let's imagine you want to use the domain `www.example.localhost`.

You can create certificates as described here:

* https://letsencrypt.org/docs/certificates-for-localhost/

You'll need to put them in the directory `domain/www.example.localhost/sni` in this example. Here's some code that does this:

```
mkdir -p domain/www.example.localhost/sni
openssl req -x509 -out domain/www.example.localhost/sni/cert.pem -keyout domain/www.example.localhost/sni/key.pem \
  -newkey rsa:2048 -nodes -sha256 \
  -subj '/CN=www.example.localhost' -extensions EXT -config <( \
   printf "[dn]\nCN=www.example.localhost\n[req]\ndistinguished_name = dn\n[EXT]\nsubjectAltName=DNS:www.example.localhost\nkeyUsage=digitalSignature\nextendedKeyUsage=serverAuth")
```

Now edit your `/etc/hosts` so that your domain really points to `127.0.0.1` for local testing. You should have a line that looks like this:

```
127.0.0.1	localhost www.example.localhost example.localhost
```

