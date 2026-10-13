/*
 * Builds email/brevo-template.yaml, the newsletter template for Brevo's RSS
 * campaign, from email/newsletter.html.
 *
 *   npm run build:email
 *
 * Brevo's template editor has a YAML view; paste the whole file over it. The
 * structure below is Brevo's own (from its RSS default template): a looped
 * 'Dynamic content' row holding one HTML block, then the footer, which must stay
 * outside the loop. The loop takes only the newest feed item, so each email is
 * one post.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stringify } from 'yaml';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const INK = '#0E100D';
const MUTED = '#6b6c69';

const block = readFileSync(join(ROOT, 'email/newsletter.html'), 'utf8')
    .replace(/^<!--[\s\S]*?-->\s*/, '')
    .replace(/\n\s*/g, '')
    .trim();

const footerText = (id, content, paddingTop, paddingBottom) => ({
    id,
    thumbnail: '/assets/img/editor/element_text.svg',
    title: 'Legal text',
    type: 'text',
    layout: {
        '320px': { width: '100%' },
        default: {
            align: 'left', color: MUTED, 'font-size': '14px', 'line-height': '1.5',
            'padding-bottom': paddingBottom, 'padding-top': paddingTop,
            'text-align': 'center', 'text-valign': 'top', valign: 'top', width: '100%',
        },
    },
    content: `<span style="font-size:13px;">${content}</span>`,
});

const template = {
    author: '',
    campaignType: 'template',
    fields: [],
    fieldsHistory: [],
    firstLoadSocialIcons: false,
    fonts: [],
    id: 'a7f0783d-4be0-4086-a14a-80bea1c37ac7',
    name: '',
    subject: '{params.feed.DESCRIPTION}',
    ui: { showDeleteOption: false },
    'user-hash': '92ab8d994816bf769b9d0b05ec11e071',
    version: '3.0.1',
    body: {
        id: 'f010a750-ce5f-43cb-b669-f6d23c88c3ed',
        type: 'body',
        layout: {
            '320px': { width: '320px' },
            default: { 'wrapper-background-color': '#ffffff', 'wrapper-width': '600px' },
        },
        content: [{
            'content-type': 'wrapper',
            id: '6e6015c0-7c4b-4d48-9df7-7e3a514f717b',
            title: 'Wrapper',
            type: 'rows',
            layout: { '320px': { width: '320px' }, default: { align: 'center', valign: 'top' } },
            content: [
                {
                    align: 'top',
                    customBlockId: '5f5a244c5b80624620552602',
                    dist: '12',
                    eventPath: 'Custom data source',
                    gutter: '20px',
                    id: 'ec4cea23-f828-465c-9a1f-80414941b803',
                    isCustomBlock: true,
                    loop: 'item in params.items | slice:":1"',
                    moduleName: 'dynamicList',
                    name: 'Dynamic content',
                    templateName: 'dynamicList',
                    thumbnail: 'https://img.mailinblue.com/2670624/images/modules/module_thumb_a78ed9dc4dd9dbca8164335198094c78_1599743054.png',
                    title: 'Content',
                    type: 'grid-row',
                    layout: {
                        '320px': { display: 'rows', 'padding-left': '0px', 'padding-right': '0px', width: '100%' },
                        default: {
                            align: 'center', 'full-width': true, 'padding-bottom': '32px', 'padding-top': '20px',
                            valign: 'top', width: '100%',
                        },
                    },
                    content: [{
                        id: 'baf5fd68-e449-4fc8-a156-6c25952e9a32',
                        isEmpty: false,
                        label: 'Drop content here',
                        title: 'column 1',
                        type: 'grid-column',
                        layout: { '320px': [], default: { 'padding-left': '0px', 'padding-right': '0px', valign: 'top' } },
                        content: [{
                            id: 'cfd76783-760f-42c1-99fd-79066137b3bd',
                            title: 'HTML',
                            type: 'raw-html',
                            layout: { '320px': {}, default: { 'padding-bottom': '0px', 'padding-top': '0px', width: '100%' } },
                            content: block,
                        }],
                    }],
                },
                {
                    align: 'top',
                    dist: '12',
                    gutter: '30px',
                    id: '03782141-6773-4dbe-8a27-63f9435bb91d',
                    moduleName: 'footer',
                    thumbnail: '/assets/img/editor/element-footer.svg',
                    title: 'Footer',
                    type: 'grid-row',
                    layout: {
                        '320px': { display: 'rows', 'padding-left': '15px', 'padding-right': '15px', width: '100%' },
                        default: {
                            align: 'center', 'background-color': '#f4f4f2', 'padding-bottom': '20px',
                            'padding-left': '0px', 'padding-right': '0px', 'padding-top': '20px', valign: 'top', width: '100%',
                        },
                    },
                    content: [{
                        id: '25a27abb-b69c-483d-ac83-f0be90ceb407',
                        isEmpty: false,
                        label: 'Drop content here',
                        title: 'grid-column',
                        type: 'grid-column',
                        layout: { '320px': [], default: { 'padding-left': '0px', 'padding-right': '0px', valign: 'top' } },
                        content: [
                            footerText('e9c58456-1eca-480c-abe2-64e1bd1a44cc', 'This email was sent to {{contact.EMAIL}}', '15px', '0px'),
                            footerText('704252ce-b556-494f-9149-0caaff47c42d', 'You&#39;re receiving it because you subscribed to updates from rooms.', '0px', '0px'),
                            footerText('619b6ce4-d454-4805-b435-c512dfb1143a',
                                `<a href="{{ mirror }}" style="color:${MUTED};">View in browser</a> | <a href="{{ unsubscribe }}" style="color:${MUTED};">Unsubscribe</a>`,
                                '15px', '15px'),
                            {
                                id: 'c7470894-e481-4bb0-8216-33e2b055299c',
                                isFooter: true,
                                title: 'footer',
                                type: 'rows',
                                layout: {
                                    '320px': { display: 'block', width: '100%' },
                                    default: {
                                        align: 'center', footerImageDisplay: 'block', 'padding-bottom': '15px',
                                        'padding-left': '0px', 'padding-right': '0px', 'padding-top': '0px', width: '100%',
                                    },
                                },
                                content: [{
                                    id: 'f6a371a1-d140-4a83-b7b4-4ff494873c8d',
                                    isFooterImage: true,
                                    label: 'Replace',
                                    thumbnail: '/assets/img/editor/element_image.svg',
                                    title: 'Image',
                                    type: 'image',
                                    layout: {
                                        '320px': { height: '48px', 'max-width': '129px', width: '129px' },
                                        default: {
                                            align: 'center', 'canvas-height': '48px', display: 'block', dynamic: false, embed: false,
                                            height: '48px', 'margin-top': '11px', 'padding-top': '0px', valign: 'top', width: '129px',
                                        },
                                    },
                                    content: { src: 'https://creative-assets.mailinblue.com/rnb-assets/en.png' },
                                }],
                            },
                        ],
                    }],
                },
            ],
        }],
    },
    media: { '320px': { 'max-width': 600, 'min-width': 0 } },
    styles: {
        default: { properties: { color: '#2b2c2a', 'font-family': FONT, 'font-size': '16px', 'line-height': '1.65' }, title: 'Paragraph' },
        'default-button': {
            properties: {
                'background-color': INK, 'border-color': INK, 'border-radius': '8px', 'border-width': '1px',
                color: '#ffffff', 'font-family': FONT, 'font-size': '16px', 'font-weight': 'bold', width: '150px',
            },
            title: 'css.default.buttonColor',
        },
        'default-heading1': { properties: { color: INK, 'font-family': FONT, 'font-size': '28px' }, title: 'Heading 1' },
        'default-heading2': { properties: { color: INK, 'font-family': FONT, 'font-size': '22px' }, title: 'Heading 2' },
        'default-heading3': { properties: { color: INK, 'font-family': FONT, 'font-size': '19px' }, title: 'Heading 3' },
        'default-heading4': { properties: { color: INK, 'font-family': FONT, 'font-size': '16px' }, title: 'Heading 4' },
        'default-link': { properties: { color: INK, 'text-decoration': 'underline' }, title: 'Link' },
    },
};

writeFileSync(join(ROOT, 'email/brevo-template.yaml'), stringify(template, { lineWidth: 0 }));
console.log('email/brevo-template.yaml written');
