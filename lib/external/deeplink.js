export const createFirebaseDynamicLink = async (tripId) => {
    const dynamicLinkDomain = "https://pathshare.page.link";
    const deepLink = ` https://puspendustudio.com/trip/${tripId}`; 

    const response = await fetch(
        `https://firebasedynamiclinks.googleapis.com/v1/shortLinks?key=AIzaSyCV1y35Yn5kd1h-S1ZsPPUpGdYEnT-Z7HQ`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                dynamicLinkInfo: {
                    domainUriPrefix: dynamicLinkDomain,
                    link: deepLink,
                    androidInfo: {
                        androidPackageName: "com.hemanshupatil.parcelo",
                    }
                },
            }),
        }
    );

    const data = await response.json();
    return data.shortLink;
};
