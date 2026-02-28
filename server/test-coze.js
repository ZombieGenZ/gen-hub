const fetch = require('node-fetch');

async function test() {
    try {
        const response = await fetch('https://api.coze.com/v3/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer pat_ehydnaRS4UlHUV6GjN2gmqLdfwQe8DOWRfbNLR2uWGVkwLPC11imJiKtpP7S4sic`,
                Accept: 'text/event-stream',
            },
            body: JSON.stringify({
                bot_id: '7592780087397892149',
                user_id: 'test_user',
                stream: true,
                auto_save_history: true,
                additional_messages: [
                    {
                        role: 'user',
                        content: 'Xin chào',
                        content_type: 'text',
                    },
                ],
            }),
        });

        console.log('Status:', response.status);
        console.log('Headers:', response.headers.raw());

        const reader = response.body;
        reader.on('data', chunk => {
            console.log(chunk.toString());
        });
    } catch (e) {
        console.error(e);
    }
}
test();
