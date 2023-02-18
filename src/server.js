const http = require('http');
const querystring = require('querystring');
const fs = require('fs/promises')
const data = require('./data.json')

const hostname = '127.0.0.1';
const port = 3000;

async function renderCatList(query) {
    const template = (await fs.readFile('./src/partials/cat-list-item.html', {encoding: "utf-8"}))

    return data
        .filter(c => {
            if (!query) {
                return c
            }

            if (c.name.toLowerCase().includes(query.toLowerCase())) {
                c.matchBy = 'name';

                return c;
            }

            if (c.breed.toLowerCase().includes(query.toLowerCase())) {
                c.matchBy = 'breed';

                return c;
            }

            if (c.description.toLowerCase().includes(query.toLowerCase())) {
                c.matchBy = 'description';

                return c;
            }
        })
        .sort((a, b) => {
            if (!a.matchBy) {
                return 0;
            }

            if (a.matchBy === 'name' && b.matchBy === 'name') {
                return a.name.localeCompare(b.name);
            }

            if (a.matchBy === 'description' && b.matchBy === 'description') {
                return a.name.localeCompare(b.name);
            }

            if (a.matchBy === 'breed' && b.matchBy === 'breed') {
                return a.breed.localeCompare(b.breed);
            }

            if (a.matchBy === 'name' && b.matchBy !== 'name') {
                return 0;
            }

            if (a.matchBy !== 'name' && b.matchBy === 'name') {
                return 1;
            }

            return a.breed.localeCompare(b.breed);
        })
        .map(cat => {
            let catTemplate = template;

            Object.keys(cat)
                .forEach(key => {
                    catTemplate = catTemplate.replaceAll(`{{${key}}}`, cat[key])
                });

            return catTemplate;
        }).join('')
}

async function renderHomepage() {
    return (await buildPage('home/index'))
        .replaceAll('{{cat-list-items}}', (await renderCatList()))
        .replaceAll('{{query}}', '')
}

async function renderSearch(query) {
    return (await buildPage('home/index'))
        .replaceAll('{{cat-list-items}}', (await renderCatList(query)))
        .replaceAll('{{query}}', query)
}

function renderStyle(styleName) {
    return fs.readFile(`./src/content/${styleName}`, {encoding: "utf-8"})
}

function renderIcon(iconPath) {
    return fs.readFile(`./src/content/${iconPath}`, {encoding: "utf-8"})
}

function error404(res) {
    res.write(`<h1>ERROR 404</h1>`)
    res.end();
}

async function renderEditPage(cat) {
    let template = (await buildPage('editCat'));

    Object.keys(cat)
        .forEach(key => {
            template = template.replaceAll(`{{${key}}}`, cat[key])
        });

    return template;
}

async function renderPartial(templateName) {
    return (await fs.readFile(`./src/partials/${templateName}.html`, {encoding: "utf-8"}))
}

async function buildPage(view) {
    const partials = {
        'nav-menu': async () => await renderPartial('nav-menu')
    }

    let template = (await fs.readFile(`./src/views/${view}.html`, {encoding: "utf-8"}))

    for (const key in partials) {
        const partial = await partials[key]();
        template = template.replaceAll(`{{${key}}}`, partial);
    }

    return template;
}

async function renderCatCreate() {
    return await buildPage('addCat');
}

async function renderBreedCreate() {
    return await buildPage('addBreed');
}

function isPost(req) {
    if (req.method === 'POST') {
        const chunks = [];
        req.on("data", (chunk) => {
            chunks.push(chunk);
        });
        req.on("end", () => {
            const obj = querystring.decode(Buffer.concat(chunks).toString());

            console.log('data obj', obj);
        });

        return true;
    }

    return false;
}

const server = http.createServer(async function (req, res) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');

    console.log(req.url);
    console.log(req.method);

    if (req.url === '/') {
        let html = await renderHomepage();
        res.write(html);
        res.end();

        return;
    }

    if (req.url.includes('/search?q=')) {
        const rawParams = req.url.replace('/search?', '');
        const params = querystring.decode(rawParams);

        let html = await renderSearch(params.q);
        res.write(html);
        res.end();

        return;
    }

    if (req.url.includes('/cats/add-cat')) {
        if (isPost(req)) {
            res.end();

            return;
        }

        let html = await renderCatCreate();
        res.write(html);
        res.end();

        return;
    }

    if (req.url.includes('/cats/add-breed')) {
        if (isPost(req)) {
            res.end();

            return;
        }

        let html = await renderBreedCreate();
        res.write(html);
        res.end();

        return;
    }

    if ((/\/cats\/\d+\/edit/).test(req.url)) {
        if (isPost(req)) {
            res.end();

            return;
        }

        const catId = req.url.slice(1)
            .split('/')[1];
        const cat = data.find(c => c.id === +catId)

        if (!cat) {
            error404(res);
            return;
        }

        res.write(await renderEditPage(cat));
        res.end();

        return;
    }

    if (req.url.includes('/styles/')) {
        res.setHeader('Content-Type', 'text/css');
        let style = await renderStyle(req.url);
        res.write(style);
        res.end();

        return;
    }

    if (req.url.includes('/images/')) {
        res.setHeader('Content-Type', 'image/x-icon');
        let style = await renderIcon(req.url);
        res.write(style);
        res.end();

        return;
    }

    error404(res);
});

server.listen(port, hostname, function () {
    console.log('Server running at http://' + hostname + ':' + port + '/');
});