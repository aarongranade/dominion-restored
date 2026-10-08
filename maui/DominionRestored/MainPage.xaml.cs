using Microsoft.AspNetCore.Components.WebView;
using Microsoft.JSInterop;

namespace DominionRestored;

public partial class MainPage : ContentPage
{
    bool _confirmingQuit;

    public MainPage()
    {
        InitializeComponent();
    }

    /// <summary>Posts a command ("pause", "resume", "mute", "unmute") to the game running in the iframe.</summary>
    public void SendToGame(string command)
    {
        _ = blazorWebView.TryDispatchAsync(sp =>
        {
            var js = sp.GetRequiredService<IJSRuntime>();
            _ = js.InvokeVoidAsync("drGame.send", command);
        });
    }

    void OnWebViewInitializing(object? sender, BlazorWebViewInitializingEventArgs e)
    {
#if IOS
        // let WebAudio and media play inline without extra gestures
        e.Configuration.AllowsInlineMediaPlayback = true;
        e.Configuration.MediaTypesRequiringUserActionForPlayback = WebKit.WKAudiovisualMediaTypes.None;
#endif
    }

    void OnWebViewInitialized(object? sender, BlazorWebViewInitializedEventArgs e)
    {
#if ANDROID
        var settings = e.WebView.Settings;
        settings.MediaPlaybackRequiresUserGesture = false;
        settings.SetSupportZoom(false);
        settings.BuiltInZoomControls = false;
        settings.DisplayZoomControls = false;
        e.WebView.OverScrollMode = Android.Views.OverScrollMode.Never;
        e.WebView.HapticFeedbackEnabled = false;
        e.WebView.LongClickable = false;
        e.WebView.SetOnLongClickListener(new NoLongClick());
#elif IOS
        e.WebView.ScrollView.ScrollEnabled = false;
        e.WebView.ScrollView.Bounces = false;
        e.WebView.ScrollView.ContentInsetAdjustmentBehavior = UIKit.UIScrollViewContentInsetAdjustmentBehavior.Never;
        e.WebView.Opaque = false;
        e.WebView.BackgroundColor = UIKit.UIColor.FromRGB(0x0B, 0x0B, 0x14);
#endif
    }

    // Android back button: pause the game and ask before quitting
    protected override bool OnBackButtonPressed()
    {
        if (_confirmingQuit) return true;
        _confirmingQuit = true;
        SendToGame("pause");
        Dispatcher.Dispatch(async () =>
        {
            bool quit = await DisplayAlert("Quit Dominion Restored?", "Your progress is saved whenever you change screens or win a treasure.", "Quit", "Keep playing");
            _confirmingQuit = false;
            if (quit) Application.Current?.Quit();
        });
        return true;
    }

#if ANDROID
    sealed class NoLongClick : Java.Lang.Object, Android.Views.View.IOnLongClickListener
    {
        public bool OnLongClick(Android.Views.View? v) => true;
    }
#endif
}
